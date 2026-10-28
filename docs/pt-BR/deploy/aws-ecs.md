---
title: AWS ECS Fargate
summary: Implante o Paperclip na AWS usando ECS Fargate, RDS Postgres e EFS
---

Implante o Paperclip na AWS com ECS Fargate (computação), RDS Postgres 17 (banco de dados) e EFS (armazenamento persistente). Este guia usa a AWS CLI e cria um serviço ECS com uma única tarefa atrás de um ALB com HTTPS.

## Pré-requisitos

- AWS CLI v2 configurada com um perfil que tenha permissões de administrador
- Docker instalado localmente (para compilar e enviar a imagem)
- Um domínio registrado com DNS sob seu controle (para o certificado TLS)
- O repositório do Paperclip clonado localmente

Defina estas variáveis de shell para o restante do guia:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export PAPERCLIP_DOMAIN=paperclip.example.com   # seu domínio
export DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
export AUTH_SECRET=$(openssl rand -base64 32)
```

## 1. Criar o repositório ECR

```bash
aws ecr create-repository \
  --repository-name paperclip-server \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION
```

## 2. Compilar e enviar a imagem Docker

```bash
cd /path/to/paperclip

# Autenticar o Docker no ECR
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Compilar
docker build -t paperclip-server .

# Marcar e enviar
docker tag paperclip-server:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest

docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest
```

## 3. Rede (VPC, sub-redes e grupos de segurança)

Use a VPC padrão ou crie uma dedicada. O guia pressupõe a VPC padrão com sub-redes públicas e privadas em duas zonas de disponibilidade.

```bash
# Obter a VPC padrão
VPC_ID=$(aws ec2 describe-vpcs \
  --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)

# Obter duas sub-redes públicas (para o ALB)
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query 'Subnets[?MapPublicIpOnLaunch==`true`] | [0:2].SubnetId' \
  --output text)
SUBNET_1=$(echo $SUBNET_IDS | awk '{print $1}')
SUBNET_2=$(echo $SUBNET_IDS | awk '{print $2}')
```

Crie grupos de segurança:

```bash
# Grupo de segurança do ALB — entrada HTTPS
ALB_SG=$(aws ec2 create-security-group \
  --group-name paperclip-alb \
  --description "Paperclip ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Abrir também a porta 80 para o ALB aceitar HTTP e redirecionar para HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# Grupo de segurança da tarefa ECS — entrada somente do ALB
ECS_SG=$(aws ec2 create-security-group \
  --group-name paperclip-ecs \
  --description "Paperclip ECS tasks" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp --port 3100 \
  --source-group $ALB_SG

# Grupo de segurança do RDS — entrada somente do ECS
RDS_SG=$(aws ec2 create-security-group \
  --group-name paperclip-rds \
  --description "Paperclip RDS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp --port 5432 \
  --source-group $ECS_SG

# Grupo de segurança do EFS — entrada NFS somente do ECS
EFS_SG=$(aws ec2 create-security-group \
  --group-name paperclip-efs \
  --description "Paperclip EFS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $EFS_SG \
  --protocol tcp --port 2049 \
  --source-group $ECS_SG
```

## 4. Criar a instância RDS Postgres

```bash
# VPCs personalizadas não têm grupo de sub-redes padrão para banco; crie um
# que inclua as duas sub-redes para o RDS posicionar a instância.
aws rds create-db-subnet-group \
  --db-subnet-group-name paperclip-db-subnet \
  --db-subnet-group-description "Paperclip RDS subnets" \
  --subnet-ids $SUBNET_1 $SUBNET_2

aws rds create-db-instance \
  --db-instance-identifier paperclip-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 17 \
  --master-username paperclip \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name paperclip-db-subnet \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --no-multi-az \
  --db-name paperclip \
  --region $AWS_REGION

# Aguarde a disponibilidade (leva de 5 a 10 minutos)
aws rds wait db-instance-available \
  --db-instance-identifier paperclip-db

# Obtenha o endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier paperclip-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)

DATABASE_URL="postgresql://paperclip:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/paperclip"
```

## 5. Criar o sistema de arquivos EFS

```bash
EFS_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=paperclip-data \
  --query 'FileSystemId' --output text)

# Crie alvos de montagem em cada sub-rede
for SUBNET in $SUBNET_1 $SUBNET_2; do
  aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $SUBNET \
    --security-groups $EFS_SG
done

# Aguarde os alvos de montagem
aws efs describe-mount-targets --file-system-id $EFS_ID
```

## 6. Armazenar segredos

```bash
aws secretsmanager create-secret \
  --name paperclip/database-url \
  --secret-string "$DATABASE_URL"

aws secretsmanager create-secret \
  --name paperclip/anthropic-api-key \
  --secret-string "YOUR_ANTHROPIC_KEY"

aws secretsmanager create-secret \
  --name paperclip/better-auth-secret \
  --secret-string "$AUTH_SECRET"

aws secretsmanager create-secret \
  --name paperclip/openai-api-key \
  --secret-string "YOUR_OPENAI_KEY"

aws secretsmanager create-secret \
  --name paperclip/github-token \
  --secret-string "YOUR_GITHUB_PAT"
```

## 7. Funções IAM

Crie a função de execução da tarefa ECS (baixa imagens e lê segredos) e a função da tarefa (permissões da aplicação).

```bash
# Função de execução da tarefa
aws iam create-role \
  --role-name paperclip-ecs-execution \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name paperclip-ecs-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Permitir leitura de segredos
aws iam put-role-policy \
  --role-name paperclip-ecs-execution \
  --policy-name SecretsAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:'$AWS_REGION':'$AWS_ACCOUNT_ID':secret:paperclip/*"
    }]
  }'

# Função da tarefa (aplicação — adicione permissões conforme necessário)
aws iam create-role \
  --role-name paperclip-ecs-task \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

## 8. Cluster ECS e definição da tarefa

```bash
aws ecs create-cluster --cluster-name paperclip

aws logs create-log-group --log-group-name /ecs/paperclip
```

Registre a definição da tarefa usando o modelo em `docker/ecs-task-definition.json`. Antes de registrar, substitua os valores de placeholder:

```bash
sed -e "s|<ACCOUNT_ID>|$AWS_ACCOUNT_ID|g" \
    -e "s|<REGION>|$AWS_REGION|g" \
    -e "s|<EFS_ID>|$EFS_ID|g" \
    -e "s|<DOMAIN>|$PAPERCLIP_DOMAIN|g" \
    docker/ecs-task-definition.json > /tmp/paperclip-task-def.json

aws ecs register-task-definition \
  --cli-input-json file:///tmp/paperclip-task-def.json
```

## 9. ALB e certificado TLS

Solicite um certificado (a validação por DNS é obrigatória):

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name $PAPERCLIP_DOMAIN \
  --validation-method DNS \
  --query 'CertificateArn' --output text)

# Obter o registro CNAME a adicionar ao DNS
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Adicione o CNAME no seu provedor DNS e aguarde a validação:

```bash
aws acm wait certificate-validated --certificate-arn $CERT_ARN
```

Crie o ALB:

```bash
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name paperclip-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text)

# Grupo de destinos
TG_ARN=$(aws elbv2 create-target-group \
  --name paperclip-tg \
  --protocol HTTP \
  --port 3100 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# Listener HTTPS
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --query 'Listeners[0].ListenerArn' --output text)

# Listener HTTP — redirecionar todo o tráfego :80 para :443
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --query 'Listeners[0].ListenerArn' --output text)
```

Aponte seu DNS para o ALB:
- Crie um registro CNAME ou ALIAS para `$PAPERCLIP_DOMAIN` -> `$ALB_DNS`

## 10. Criar o serviço ECS

```bash
aws ecs create-service \
  --cluster paperclip \
  --service-name paperclip-server \
  --task-definition paperclip-server \
  --desired-count 1 \
  --launch-type FARGATE \
  --deployment-configuration '{
    "deploymentCircuitBreaker": {"enable": true, "rollback": true},
    "maximumPercent": 200,
    "minimumHealthyPercent": 100
  }' \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["'$SUBNET_1'", "'$SUBNET_2'"],
      "securityGroups": ["'$ECS_SG'"],
      "assignPublicIp": "ENABLED"
    }
  }' \
  --load-balancers '[{
    "targetGroupArn": "'$TG_ARN'",
    "containerName": "paperclip-server",
    "containerPort": 3100
  }]'
```

> **Observação:** `assignPublicIp: ENABLED` é necessário ao usar sub-redes públicas sem NAT Gateway. Para sub-redes privadas, defina `DISABLED` e garanta que um NAT Gateway esteja configurado para saída à internet.

## 11. Verificar a implantação

```bash
# Acompanhar a inicialização da tarefa
aws ecs describe-services \
  --cluster paperclip \
  --services paperclip-server \
  --query 'services[0].{desired:desiredCount,running:runningCount,status:status}'

# Verificar a integridade da tarefa
aws ecs list-tasks --cluster paperclip --service-name paperclip-server
TASK_ARN=$(aws ecs list-tasks --cluster paperclip --service-name paperclip-server --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster paperclip --tasks $TASK_ARN \
  --query 'tasks[0].{status:lastStatus,health:healthStatus}'

# Verificar logs
aws logs tail /ecs/paperclip --since 10m --follow

# Consultar o endpoint de integridade
curl -sf https://$PAPERCLIP_DOMAIN/api/health
```

**Indicadores de integridade:**
- Status da tarefa ECS: `RUNNING`; integridade: `HEALTHY`
- Logs mostram `plugin job coordinator started` e `plugin-loader: loadAll complete`
- `/api/health` retorna 200

## Reforço de segurança após a implantação

Após estabelecer o primeiro administrador da instância pelo fluxo de bootstrap compatível, restrinja a instância. Criar uma conta, por si só, não concede acesso de administrador:

```bash
# Desabilitar cadastro público (impede que usuários não autorizados criem contas)
# Adicionar à seção de ambiente da definição da tarefa e reimplantar:
#   { "name": "PAPERCLIP_AUTH_DISABLE_SIGN_UP", "value": "true" }

# Ou atualizar pelo Secrets Manager / substituição da definição e forçar implantação
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --force-new-deployment
```

Use o fluxo de convite (adicionado na versão v2026.416.0) para conceder acesso a outros usuários depois de desabilitar o cadastro.

## Implantar atualizações

Compile, envie a imagem e force uma nova implantação:

```bash
# Compilar e enviar a nova imagem
docker build -t paperclip-server .
docker tag paperclip-server:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest
docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/paperclip-server:latest

# Implantar
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --force-new-deployment

# Acompanhar a implantação
aws ecs describe-services \
  --cluster paperclip \
  --services paperclip-server \
  --query 'services[0].deployments[*].{status:status,running:runningCount,desired:desiredCount,rollout:rolloutState}'
```

O ECS faz uma atualização gradual: inicia uma nova tarefa, espera que ela passe nas verificações de integridade e depois drena a tarefa antiga.

## Rollback

Se a nova implantação não estiver íntegra:

```bash
# O ECS reverte automaticamente se a nova tarefa falhar nas verificações
# (o circuit breaker está habilitado na configuração do serviço acima).
# Para forçar rollback manualmente:

# 1. Encontre a revisão anterior da definição da tarefa
aws ecs list-task-definitions \
  --family-prefix paperclip-server \
  --sort DESC \
  --query 'taskDefinitionArns[0:3]'

# 2. Atualize o serviço para a revisão anterior
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --task-definition paperclip-server:<PREVIOUS_REVISION>
```

## Reduzir para zero (economia de custos)

Reduza a escala quando não estiver em uso:

```bash
# Parar
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --desired-count 0

# Iniciar
aws ecs update-service \
  --cluster paperclip \
  --service paperclip-server \
  --desired-count 1
```

O RDS também pode ser interrompido (reinicia automaticamente após 7 dias):

```bash
aws rds stop-db-instance --db-instance-identifier paperclip-db
aws rds start-db-instance --db-instance-identifier paperclip-db
```

## Remover recursos

Remova todos os recursos em ordem inversa:

```bash
# 1. Serviço e cluster ECS
aws ecs update-service --cluster paperclip --service paperclip-server --desired-count 0
aws ecs delete-service --cluster paperclip --service paperclip-server --force
aws ecs delete-cluster --cluster paperclip

# 2. ALB e certificado ACM
aws elbv2 delete-listener --listener-arn $HTTP_LISTENER_ARN
aws elbv2 delete-listener --listener-arn $LISTENER_ARN
aws elbv2 delete-target-group --target-group-arn $TG_ARN
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN
aws acm delete-certificate --certificate-arn $CERT_ARN

# 3. RDS (cria snapshot final)
aws rds delete-db-instance \
  --db-instance-identifier paperclip-db \
  --final-db-snapshot-identifier paperclip-db-final
aws rds wait db-instance-deleted --db-instance-identifier paperclip-db
aws rds delete-db-subnet-group --db-subnet-group-name paperclip-db-subnet

# 4. EFS (os alvos de montagem devem ser excluídos primeiro)
for MT in $(aws efs describe-mount-targets --file-system-id $EFS_ID --query 'MountTargets[*].MountTargetId' --output text); do
  aws efs delete-mount-target --mount-target-id $MT
done
# A exclusão dos alvos de montagem é assíncrona; consulte até não restar nenhum
# antes de excluir o sistema de arquivos, ou delete-file-system falhará com FileSystemInUse.
echo "Waiting for mount targets to delete..."
while aws efs describe-mount-targets \
  --file-system-id $EFS_ID \
  --query 'MountTargets[0].MountTargetId' --output text 2>/dev/null | grep -q 'fsmt-'; do
  sleep 5
done
aws efs delete-file-system --file-system-id $EFS_ID

# 5. Segredos
for s in database-url anthropic-api-key better-auth-secret openai-api-key github-token; do
  aws secretsmanager delete-secret --secret-id paperclip/$s --force-delete-without-recovery
done

# 6. Grupos de segurança (após remover todas as dependências)
for sg in $EFS_SG $RDS_SG $ECS_SG $ALB_SG; do
  aws ec2 delete-security-group --group-id $sg
done

# 7. ECR
aws ecr delete-repository --repository-name paperclip-server --force

# 8. Funções IAM
aws iam delete-role-policy --role-name paperclip-ecs-execution --policy-name SecretsAccess
aws iam detach-role-policy --role-name paperclip-ecs-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam delete-role --role-name paperclip-ecs-execution
aws iam delete-role --role-name paperclip-ecs-task

# 9. Grupo de logs
aws logs delete-log-group --log-group-name /ecs/paperclip
```

## Referência de custos

| Serviço | Configuração | Mensal |
|---------|--------|---------|
| ECS Fargate | 2 vCPU, 4 GB, 24/7 | ~US$ 70 |
| RDS Postgres | db.t4g.micro, 20 GB | ~US$ 15 |
| ALB | média de 1 LCU | ~US$ 22 |
| NAT Gateway | 1 zona de disponibilidade (em sub-redes privadas) | ~US$ 35 |
| EFS | 1 GB Standard | ~US$ 0,30 |
| Secrets Manager | 5 segredos | ~US$ 2 |
| CloudWatch Logs | ~1 GB/mês | ~US$ 0,50 |
| ECR | ~1 GB | ~US$ 0,10 |
| **Total (sub-redes públicas, sem NAT)** | | **~US$ 110/mês** |
| **Total (sub-redes privadas + NAT)** | | **~US$ 145/mês** |

Use Fargate Spot e escalonamento agendado para 0 fora do expediente para reduzir o custo a cerca de US$ 60–85/mês.
