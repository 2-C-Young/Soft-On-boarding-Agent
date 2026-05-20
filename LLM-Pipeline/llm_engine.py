import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_onboarding_guide(repo_name, categorized_files, simulated_rag_context=""):
    """
    이 함수는 이제 기존 레포지토리 분석 결과를 무시하고, 
    재원님의 프롬프트에 따라 Soft On-boarding Agent의 React 및 Spring Boot 뼈대 코드를 생성합니다.
    """
    
    # 1. 시스템 프롬프트: 프론트엔드와 백엔드 역할을 동시에 부여
    system_prompt = """
    너는 B2B SaaS 전문 프론트엔드 개발자이자, Spring Boot 기반의 데이터 파이프라인을 구축하는 백엔드 아키텍트야.
    현재 'Soft On-boarding Agent'의 프론트엔드(React/Vite)와 백엔드(Spring Boot) 핵심 로직을 구현해야 해.
    """

    # 2. 유저 프롬프트: 재원님이 작성하신 프롬프트 원본 + 약간의 디테일(버전, DB 등) 추가 적용
    user_prompt = """
    [Frontend 구현 요구사항]
    현재 'Soft On-boarding Agent'의 [로그인 및 팀 스페이스 온보딩] 플로우를 React(Vite)와 Tailwind CSS를 사용해 구현하려고 해.
    페이지 이동을 위해 `react-router-dom` v6를 사용하고, 아이콘은 `lucide-react`를 적용해 줘.
    디자인은 Linear, Notion처럼 화이트/그레이 톤에 모던하고 여백이 많은 스타일로 깔끔하게 구성해 줘.

    - 로그인 페이지 (LoginPage.tsx): 화면 중앙에 심플한 로고 텍스트와 함께 [Continue with GitHub] 버튼 하나만 크게 배치해 줘. (GitHub 아이콘 포함)
    - 온보딩 라우팅 페이지 (OnboardingPage.tsx): 로그인 후 팀이 없는 유저가 보는 화면이야. 화면 중앙에 예쁜 카드 UI를 배치해 줘.
      * 기본 상태 (팀 참여): '초대받은 팀 코드를 입력하세요'라는 문구와 함께 텍스트 Input, 그리고 [Join Space] 버튼을 만들어 줘.
      * 하단 토글: 그 아래에 연한 글씨로 "새로운 팀 스페이스를 구축하고 싶으신가요? [팀 생성하기]" 버튼을 만들어 줘.
    - 팀 생성 모달 또는 뷰 전환 (CreateTeamView): 위에서 [팀 생성하기]를 누르면 부드럽게 화면이 전환되며 입력창이 바뀌도록 해 줘. '분석할 GitHub 레포지토리 URL을 입력하세요' 문구와 Input, 그리고 [생성 및 분석 시작] 버튼을 만들어 줘.
    - 분석 로딩 컴포넌트 (AnalyzingLoader.tsx): [생성 및 분석 시작] 버튼을 누르면 AI가 코드를 분석한다는 느낌을 주는 세련된 로딩 화면(스피너 또는 프로그레스 바)을 띄워 줘. "AI가 레포지토리 구조와 최근 커밋 히스토리를 분석하여 4-Way View를 구축하고 있습니다..." 라는 텍스트를 포함해 줘.

    모든 상태 관리(팀 참여, 생성 전환 등)를 포함하여 작동 가능한 코드 뼈대로 작성해 줘.

    ===SPLIT===

    [Backend 구현 요구사항]
    현재 'Soft On-boarding Agent'의 [GitHub OAuth 로그인 및 팀 스페이스 분석 생성] 핵심 비즈니스 로직을 구현해야 해.
    Java 17 환경을 사용하고, 데이터베이스는 PostgreSQL 기준으로 Entity를 매핑해 줘.

    - GitHub OAuth 2.0 로그인: spring-boot-starter-oauth2-client를 활용해 GitHub 로그인을 구현하고, 성공 시 발급받은 Access Token을 DB에 유저 정보와 함께 저장해 줘. (이 토큰으로 프라이빗 레포지토리 API를 호출해야 함).
    - 팀 스페이스 참여 API (Join): 프론트에서 전달받은 teamCode를 검증하여 해당 팀에 유저를 매핑하는 엔드포인트를 만들어 줘.
    - 팀 스페이스 생성 API (Create) - ⭐️ 핵심 ⭐️: 프론트에서 GitHub Repo URL을 받으면 다음 2가지 로직을 비동기(또는 효율적으로) 처리하는 서비스 레이어를 짜 줘.
      * [로직 A: 뼈대 구축]: GitHub Git Trees API(recursive)를 호출해 파일 경로 목록을 가져온 뒤, LLM API(Google Gemini API 사용 기준)를 통해 이 파일들을 4가지 카테고리(Functional, Data, Interface, Process)로 분류하여 DB 컴포넌트 테이블에 저장해 줘. LLM API 호출 부분은 서비스 레이어 뼈대만 작성해.
      * [로직 B: 히스토리 매핑]: GitHub Commits API를 호출해 해당 레포의 '최근 100개' 커밋 내역과 Diff를 가져와. 그리고 이 커밋들이 수정/생성한 파일 경로를 바탕으로, [로직 A]에서 만든 컴포넌트 노드들과 매핑하여 CommitHistory 테이블에 저장해 줘. (프론트에서 특정 노드 클릭 시 이 히스토리가 조회되어야 함).

    코드 구조는 Controller, Service, Repository(JPA) 패턴으로 깔끔하게 나누고, 외부 API(GitHub) 통신 부분은 WebClient 또는 RestTemplate을 사용하는 뼈대 코드로 작성해 줘.
    
    [중요 규칙]
    반드시 Frontend 가이드 작성이 끝난 직후, Backend 가이드를 시작하기 전에 정확히 '===SPLIT===' 이라는 텍스트를 출력해서 두 파트를 완벽하게 구분해 줘. (이 기호를 기준으로 파이썬 시스템이 파일을 쪼갤 예정이야)
    """

    print("[LLM] 재원님의 커스텀 프롬프트를 바탕으로 React 및 Spring Boot 코드를 생성 중입니다...")
    
    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.7,
        )
    )
    
    return response.text
