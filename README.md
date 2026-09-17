# AWS ECS CI/CD with Terraform + Jenkins

Architecture:

GitHub
  ├── Terraform ──> VPC / Subnets / Security Group / ECR / ECS / IAM
  └── Jenkins ──> Docker build ──> ECR ──> ECS

## Resources created by Terraform

- VPC
- 2 public subnets
- Internet Gateway and route table
- ALB security group
- ECS security group
- ECR repository
- ECS Fargate cluster
- IAM execution/task roles
- CloudWatch log group
- ALB, target group and listener
- ECS task definition
- ECS service

## Deploy infrastructure

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
terraform output
```

## Jenkins setup

Install/configure on the Jenkins agent:

- Git
- Docker
- AWS CLI
- Python 3
- Jenkins Pipeline
- AWS Credentials plugin

Create Jenkins credential:

**Kind:** AWS Credentials  
**ID:** `aws-jenkins`

The Jenkinsfile performs:

1. GitHub checkout
2. Application validation
3. ECR authentication
4. Docker build
5. Docker push to ECR
6. ECS task-definition registration
7. ECS service update
8. ECS deployment wait

## Required IAM permissions for the Jenkins AWS credential

For a lab, the following permissions are sufficient for the pipeline. In production, scope resources more tightly.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": "*"
    }
  ]
}
```

## Test

Get the ALB DNS name:

```bash
terraform -chdir=terraform output -raw alb_dns_name
```

Open:

```text
http://<ALB-DNS-NAME>
http://<ALB-DNS-NAME>/health
```

This is intentionally a learning/lab architecture using public ECS tasks. For production, use private ECS subnets, HTTPS/ACM, least-privilege IAM, secrets management, remote Terraform state and separate environments.
# aws-ecs-jenkins-terraform
