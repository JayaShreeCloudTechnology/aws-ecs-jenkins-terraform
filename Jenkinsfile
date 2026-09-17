pipeline {
    agent any

    parameters {
        string(name: 'AWS_REGION', defaultValue: 'ap-northeast-1')
        string(name: 'PROJECT_NAME', defaultValue: 'aws-ecs-cicd')
    }

    environment {
        AWS_DEFAULT_REGION = "${params.AWS_REGION}"
        ECR_REPOSITORY = "${params.PROJECT_NAME}"
        ECS_CLUSTER = "${params.PROJECT_NAME}-cluster"
        ECS_SERVICE = "${params.PROJECT_NAME}-service"
        ECS_TASK_FAMILY = "${params.PROJECT_NAME}-task"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate') {
            steps {
                sh '''
                    set -eux
                    node --check app/server.js
                    docker --version
                    aws --version
                    python3 --version
                '''
            }
        }

        stage('Docker Build & Push') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-jenkins'
                ]]) {
                    sh '''
                        set -eux

                        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                        ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"

                        aws ecr get-login-password --region "${AWS_DEFAULT_REGION}" |
                          docker login --username AWS --password-stdin "${ECR_URL}"

                        docker build -t "${ECR_URL}/${ECR_REPOSITORY}:${IMAGE_TAG}" ./app
                        docker tag "${ECR_URL}/${ECR_REPOSITORY}:${IMAGE_TAG}"                           "${ECR_URL}/${ECR_REPOSITORY}:latest"

                        docker push "${ECR_URL}/${ECR_REPOSITORY}:${IMAGE_TAG}"
                        docker push "${ECR_URL}/${ECR_REPOSITORY}:latest"
                    '''
                }
            }
        }

        stage('Deploy to ECS') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-jenkins'
                ]]) {
                    sh '''
                        set -eux

                        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                        IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

                        CURRENT=$(aws ecs describe-task-definition                           --task-definition "${ECS_TASK_FAMILY}")

                        EXECUTION_ROLE=$(echo "${CURRENT}" |
                          python3 -c 'import sys,json; print(json.load(sys.stdin)["taskDefinition"]["executionRoleArn"])')

                        TASK_ROLE=$(echo "${CURRENT}" |
                          python3 -c 'import sys,json; print(json.load(sys.stdin)["taskDefinition"].get("taskRoleArn",""))')

                        LOG_GROUP=$(echo "${CURRENT}" |
                          python3 -c 'import sys,json; print(json.load(sys.stdin)["taskDefinition"]["containerDefinitions"][0]["logConfiguration"]["options"]["awslogs-group"])')

                        cat > taskdef.json <<EOF
{
  "family": "${ECS_TASK_FAMILY}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "${EXECUTION_ROLE}",
  "taskRoleArn": "${TASK_ROLE}",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "${IMAGE_URI}",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "APP_VERSION",
          "value": "${BUILD_NUMBER}"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${LOG_GROUP}",
          "awslogs-region": "${AWS_DEFAULT_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

                        NEW_TASK_DEF=$(aws ecs register-task-definition                           --cli-input-json file://taskdef.json                           --query 'taskDefinition.taskDefinitionArn'                           --output text)

                        aws ecs update-service                           --cluster "${ECS_CLUSTER}"                           --service "${ECS_SERVICE}"                           --task-definition "${NEW_TASK_DEF}"

                        aws ecs wait services-stable                           --cluster "${ECS_CLUSTER}"                           --services "${ECS_SERVICE}"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'CI/CD deployment completed successfully.'
        }
        failure {
            echo 'CI/CD deployment failed. Check the Jenkins console log.'
        }
    }
}
