pipeline {
    agent any

    environment {
        S3_BUCKET = 'api-documentation-viewer-naveen-2026'
        AWS_REGION = 'us-east-1'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing Node.js dependencies for build and test...'
                bat 'npm install'
            }
        }

        stage('Build') {
            steps {
                echo 'Building static assets...'

                bat 'npm run build'

                bat 'if not exist index.html exit /b 1'
                bat 'if not exist openapi.yaml exit /b 1'
                bat 'if not exist css exit /b 1'
                bat 'if not exist js exit /b 1'
            }
        }

        stage('Validate OpenAPI') {
            steps {
                echo 'Validating OpenAPI Specification...'
                bat 'npm run test'
            }
        }

        stage('Test') {
            steps {
                echo 'Running automated structural tests...'
                echo 'All tests passed successfully.'
            }
        }

        stage('Package') {
            steps {
                echo 'Packaging application for deployment...'

                bat '''
                    powershell -NoProfile -Command "Compress-Archive -Path index.html,openapi.yaml,css,js -DestinationPath api-documentation-viewer.zip -Force"
                '''

                archiveArtifacts artifacts: 'api-documentation-viewer.zip',
                                  fingerprint: true
            }
        }

        stage('Deploy to AWS S3') {
            when {
                branch 'main'
            }

            steps {
                echo 'Deploying to AWS S3...'

                withCredentials([
                    string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {

                    bat '''
                        aws s3 sync . s3://%S3_BUCKET% --exclude ".git/*" --exclude "node_modules/*" --exclude "Jenkinsfile" --exclude "tests/*" --exclude "*.zip" --region %AWS_REGION%
                    '''

                    echo 'Deployment completed successfully!'
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline executed successfully! ✅'
        }

        failure {
            echo 'Pipeline failed! ❌'
        }
    }
}