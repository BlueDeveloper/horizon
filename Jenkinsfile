// =================================================================
// Horizon Project - Jenkins Pipeline
// Next.js 웹 애플리케이션 자동 배포 파이프라인
// =================================================================

pipeline {
  agent any

  // NodeJS Plugin 미설치 시 tools 블록 제거
  // Node.js가 Jenkins 서버에 직접 설치되어 있어야 함
  // 설치 확인: node -v, npm -v

  stages {
    // =================================================================
    // Stage 1: Git 소스 코드 체크아웃
    // =================================================================
    stage('Checkout') {
      steps {
        echo '📥 Checking out source code from Git...'
        checkout scm
      }
    }

    // =================================================================
    // Stage 2: npm 의존성 설치
    // =================================================================
    stage('Install Dependencies') {
      steps {
        echo '📦 Installing npm dependencies...'
        sh '''
          set -euo pipefail

          # Node/npm 버전 확인
          node -v
          npm -v

          # 의존성 설치 (clean install)
          npm ci --legacy-peer-deps
        '''
      }
    }

    // =================================================================
    // Stage 3: Next.js 프로젝트 빌드
    // Next.js는 기본적으로 .next 폴더에 빌드 결과 생성
    // Static Export를 사용하는 경우 out 폴더 생성
    // =================================================================
    stage('Build') {
      steps {
        echo '🏗️ Building Next.js application...'
        sh '''
          set -euo pipefail

          # Next.js 빌드
          npm run build

          # 빌드 결과 확인
          echo "Build artifacts:"
          ls -lh .next/ || echo ".next folder not found"
          ls -lh out/ || echo "out folder not found (static export가 아닐 수 있음)"
        '''
      }
    }

    // =================================================================
    // Stage 4: 배포 (정적 파일 또는 Next.js 서버)
    //
    // 주의사항:
    // 1. /opt/horizon-fe 디렉터리가 미리 생성되어 있어야 함
    // 2. Jenkins 사용자에게 sudo NOPASSWD 권한 필요
    // 3. /etc/sudoers.d/jenkins 파일에 필요한 명령어 등록
    // =================================================================
    stage('Deploy') {
      steps {
        echo '🚀 Deploying application to server...'
        sh '''
          set -euo pipefail

          # 배포 디렉터리 초기화
          sudo -n /bin/rm -rf /opt/horizon-fe/*

          # Next.js Static Export를 사용하는 경우 (out 폴더)
          if [ -d "out" ]; then
            echo "Deploying static export (out folder)..."
            sudo -n /bin/cp -r out/* /opt/horizon-fe/

          # Next.js 표준 빌드를 사용하는 경우 (.next 폴더 + Node.js 서버)
          elif [ -d ".next" ]; then
            echo "Deploying Next.js build (.next folder)..."
            sudo -n /bin/cp -r .next /opt/horizon-fe/
            sudo -n /bin/cp -r public /opt/horizon-fe/
            sudo -n /bin/cp package.json /opt/horizon-fe/
            sudo -n /bin/cp package-lock.json /opt/horizon-fe/

            # Node.js 서비스 재시작 (systemd 사용 시)
            sudo -n /bin/systemctl restart horizon
            sudo -n /bin/systemctl status horizon --no-pager -l

          else
            echo "❌ Build output not found!"
            exit 1
          fi

          # 파일 권한 설정 (Nginx가 읽을 수 있도록)
          sudo -n /usr/bin/find /opt/horizon-fe -type d -exec /bin/chmod 755 {} \\;
          sudo -n /usr/bin/find /opt/horizon-fe -type f -exec /bin/chmod 644 {} \\;

          # SELinux 컨텍스트 복원 (RHEL/Oracle Linux/CentOS)
          sudo -n /sbin/restorecon -Rv /opt/horizon-fe || true

          # Nginx 설정 리로드
          sudo -n /bin/systemctl reload nginx

          echo "✅ Deployment completed successfully"
        '''
      }
    }

    // =================================================================
    // Stage 5: 배포 검증
    // HTTP 요청을 통해 배포가 정상적으로 완료되었는지 확인
    // =================================================================
    stage('Verify') {
      steps {
        echo '✅ Verifying deployment...'
        sh '''
          set -euo pipefail

          # 1. 메인 페이지 확인
          echo "Checking main page..."
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
          echo "Main page HTTP status: $HTTP_CODE"

          if [ "$HTTP_CODE" != "200" ]; then
            echo "❌ Main page check failed! Expected 200, got $HTTP_CODE"
            exit 1
          fi

          # 2. Static Export를 사용하는 경우: JavaScript 파일 Content-Type 확인
          if [ -f "/opt/horizon-fe/index.html" ]; then
            echo "Checking JavaScript assets..."

            # index.html에서 JS 파일 경로 추출
            ASSET=$(grep -oE '/assets/[^"]+\\.js' /opt/horizon-fe/index.html | head -n 1 || echo "")

            if [ -n "$ASSET" ]; then
              echo "Found asset: $ASSET"

              # Content-Type 확인
              CT=$(curl -sI "http://127.0.0.1${ASSET}" | tr -d '\\r' | awk -F': ' 'tolower($1)=="content-type"{print $2}')
              echo "Content-Type: $CT"

              # JavaScript로 응답하는지 확인 (HTML로 응답하면 실패)
              if echo "$CT" | egrep -qi 'javascript'; then
                echo "✅ JavaScript assets are served correctly"
              else
                echo "❌ JavaScript assets are not served correctly! Got: $CT"
                exit 1
              fi
            else
              echo "⚠️ No JavaScript assets found in index.html"
            fi
          fi

          # 3. API Route 확인 (있는 경우)
          echo "Checking API routes..."
          API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/images?type=home || echo "000")
          echo "API route HTTP status: $API_CODE"

          if [ "$API_CODE" = "200" ]; then
            echo "✅ API routes are working"
          else
            echo "⚠️ API route check returned: $API_CODE (may not exist)"
          fi

          echo ""
          echo "============================================"
          echo "✅ Deployment verification completed!"
          echo "============================================"
        '''
      }
    }
  }

  // =================================================================
  // Post Actions: 빌드 결과에 따른 후처리
  // =================================================================
  post {
    success {
      echo '✅ ======================================'
      echo '✅ Horizon deployment successful!'
      echo '✅ ======================================'
    }

    failure {
      echo '❌ ======================================'
      echo '❌ Horizon deployment failed!'
      echo '❌ Please check the logs above'
      echo '❌ ======================================'
    }

    always {
      echo '📊 Pipeline execution finished'
    }
  }
}

