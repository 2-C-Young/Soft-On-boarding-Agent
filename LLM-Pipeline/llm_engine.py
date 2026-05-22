import os
import re
import logging
from pathlib import Path
from typing import Dict, Any
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# 🚀 [안정성 강화] llm_engine만 단독으로 임포트되더라도 API Key 에러가 나지 않도록 로컬 .env 로드를 추가합니다.
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
# pyrefly: ignore [missing-import]
from supabase import create_client, Client as SupabaseClient

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

import json

def categorize_files_with_gemini(file_paths):
    """
    파일 경로 리스트를 받아 4-Way View 카테고리로 분류합니다.
    """
    categorized = {
        "Interface": [],
        "Functional": [],
        "Data": [],
        "Process": []
    }
    
    for path in file_paths:
        lower_path = path.lower()
        if any(ignore in lower_path for ignore in ['.git/', 'node_modules/', 'venv/', '__pycache__', '.jpg', '.png', '.ico', '.svg', 'package-lock.json', 'yarn.lock']):
            continue
            
        if lower_path.endswith('.json'):
            if 'package.json' in lower_path:
                categorized["Process"].append(path)
            else:
                categorized["Data"].append(path)
            continue
            
        if any(kw in lower_path for kw in ['components', 'pages', 'views', 'ui', 'styles', 'css', 'tailwind', '.jsx', '.tsx', 'router']):
            categorized["Interface"].append(path)
        elif any(kw in lower_path for kw in ['entity', 'domain', 'dto', 'schema', 'prisma', 'sql', 'ddl', 'models', 'migrations']):
            categorized["Data"].append(path)
        elif any(kw in lower_path for kw in ['.github', 'workflows', 'docker', 'build.gradle', 'pom.xml', 'package.json', 'Makefile', 'ci', 'cd']):
            categorized["Process"].append(path)
        elif any(kw in lower_path for kw in ['service', 'utils', 'handler', 'controller', 'api', 'logic', '.py', '.java', '.go', '.ts', '.js']):
            categorized["Functional"].append(path)
            
    return categorized

def extract_domain_from_path(file_path: str) -> str:
    """
    경로 기반으로 언어/프레임워크 무관하게 확정적(Deterministic)인 도메인 명을 추출합니다.
    """
    if not file_path:
        return "Core Domain"
        
    ignored_folders = {
        'src', 'main', 'java', 'com', 'net', 'org', 'app', 'lib', 'pkg', 
        'internal', 'components', 'pages', 'services', 'controllers', 'views', 
        'utils', 'api', 'domain', 'routes', 'hooks', 'store', 'tests', 'test', 'spec', 'bin',
        'dto', 'entity', 'repository', 'controller', 'model', 'exception', 'config'
    }
    
    # 1. 파일의 부모 디렉토리 경로 추출
    dir_path = os.path.dirname(file_path)
    if not dir_path:
        # 루트 디렉토리의 파일인 경우
        return "Core Domain"
        
    parts = dir_path.split('/')
    
    # 2. 의미 없는 아키텍처 폴더 필터링
    filtered_parts = [p for p in parts if p and p.lower() not in ignored_folders]
    
    # 3. 마지막(핵심) 폴더명을 도메인 이름으로 지정
    if filtered_parts:
        last_part = filtered_parts[-1]
        # Kebab/Snake case를 공백으로 변환하고 대문자화 (예: user-auth -> User Auth)
        formatted_name = last_part.replace('-', ' ').replace('_', ' ').title()
        return f"{formatted_name} Domain"
        
    # 필터링 후 남은게 없다면 (예: src/components 직하위) 
    # 원래 parts의 마지막 유효한 디렉토리 이름 사용 (components 자체)
    last_valid = [p for p in parts if p]
    if last_valid:
        formatted_name = last_valid[-1].replace('-', ' ').replace('_', ' ').title()
        return f"{formatted_name} Domain"
        
    return "Core Domain"

def call_gemini_with_retry(model_name: str, contents: str, config: types.GenerateContentConfig, view_name: str):
    """Gemini API 호출 시 Rate Limit(429) 등 오류 발생 시 스마트 재시도를 수행하는 헬퍼 함수"""
    import time
    import re
    
    def _get_retry_delay(err_str, default=60):
        m = re.search(r'Please retry in (\d+\.?\d*)s', err_str)
        return float(m.group(1)) + 1.0 if m else default

    max_retries = 5
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "Quota" in err_str:
                if attempt < max_retries - 1:
                    wait_time = _get_retry_delay(err_str, 60)
                    logger.warning(f"[{view_name}] 429 Rate Limit 초과. {wait_time:.1f}초 대기 후 재시도... ({attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
            logger.error(f"[{view_name}] LLM 분석 중 예외 발생: {e}")
            return None
    return None

def analyze_functional_view(repo_name, files_content_dict):
    system_prompt = """
    너는 시니어 백엔드 아키텍트야. 주어진 여러 소스코드 파일들을 분석해.
    
    [핵심 지시사항]
    파일 내용들을 바탕으로 분석 결과를 아래와 같은 JSON 배열 형태로 반환해. 반드시 다음 형태를 지켜야 해:
    [
      {
        "file_path": "분석한 파일의 경로",
        "trees": [
          {
            "name": "클래스명 또는 주요 구조체명",
            "description": "이 클래스/구조체의 역할 설명",
            "rings": [
              {
                "name": "메서드명 또는 함수명",
                "description": "이 메서드/함수의 역할",
                "api_method": "HTTP 메서드 (예: GET, POST 등. 없으면 null)",
                "api_url": "API 엔드포인트 경로 (없으면 null)"
              }
            ]
          }
        ]
      }
    ]

    [필터링 지시사항 (매우 중요)]
    신규 입사자의 인지 과부하를 막기 위해, 모든 메서드를 다 뽑지 말고 핵심만 엄선해.
    1. **추출 대상**: [외부와 통신하는 API 엔드포인트]와 [핵심 비즈니스 로직을 담당하는 Public 메서드] 등, 이 클래스/파일에서 가장 중요한 역할(진입점)을 하는 핵심 요소만 `rings`로 반환해.
    2. **제외 대상 (절대 추출 금지)**: 단순 유틸리티 함수, 데이터 파싱용 헬퍼 메서드, Private 메서드, Getter/Setter 등은 절대 추출하지 마.

    [중요 예외 처리]
    만약 파일에 명시적인 클래스 선언이 없고 함수만 존재하는 경우(예: 파이썬 스크립트, React 컴포넌트, 유틸리티 등), 
    **파일 이름 자체나 모듈 역할**을 하나의 `tree`로 만들고, 파일 내의 핵심 함수들을 해당 `tree`의 `rings` 배열 안에 넣어.
    """
    
    # 1. 단일 텍스트로 병합
    combined_content = ""
    for file_path, content in files_content_dict.items():
        combined_content += f"\n\n--- FILE: {file_path} ---\n{content}"
        
    response = call_gemini_with_retry(
        model_name='gemini-3.5-flash',
        contents=f"레포지토리: {repo_name}\n\n파일 내용 모음:{combined_content}",
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,
            response_mime_type="application/json"
        ),
        view_name="Functional View"
    )
    
    if not response:
        return []
        
    raw_text = response.text
    cleaned_text = re.sub(r'^```(json)?|```$', '', raw_text.strip(), flags=re.MULTILINE).strip()
    try:
        results = json.loads(cleaned_text)
    except Exception as e:
        logger.error(f"[Functional View] JSON 파싱 실패: {e}")
        return []
        
    if not isinstance(results, list):
        results = [results]
        
    # 조립 파트
    final_nodes = []
    forest_map = {} # domain_name -> temp_id
    temp_id_counter = 1
    
    for file_res in results:
        if not file_res or not isinstance(file_res, dict):
            continue
            
        file_path = file_res.get("file_path", "")
        # 경로 기반으로 확정적(Deterministic) 도메인 이름 생성
        domain_name = extract_domain_from_path(file_path)
            
        if domain_name not in forest_map:
            forest_map[domain_name] = str(temp_id_counter)
            final_nodes.append({
                "temp_id": str(temp_id_counter),
                "parent_temp_id": None,
                "name": domain_name,
                "element_type": "FOREST",
                "description": f"{domain_name} 비즈니스 영역",
                "file_path": None,
                "api_method": None,
                "api_url": None
            })
            temp_id_counter += 1
            
        forest_id = forest_map[domain_name]
        
        trees = file_res.get("trees", [])
        for tree in trees:
            tree_id = str(temp_id_counter)
            temp_id_counter += 1
            
            final_nodes.append({
                "temp_id": tree_id,
                "parent_temp_id": forest_id,
                "name": tree.get("name", "Unknown"),
                "element_type": "TREE",
                "description": tree.get("description", ""),
                "file_path": file_path,
                "api_method": None,
                "api_url": None
            })
            
            rings = tree.get("rings", [])
            for ring in rings:
                ring_id = str(temp_id_counter)
                temp_id_counter += 1
                
                final_nodes.append({
                    "temp_id": ring_id,
                    "parent_temp_id": tree_id,
                    "name": ring.get("name", "Unknown"),
                    "element_type": "RING",
                    "description": ring.get("description", ""),
                    "file_path": file_path,
                    "api_method": ring.get("api_method"),
                    "api_url": ring.get("api_url")
                })
                
    return final_nodes

def analyze_interface_view(repo_name, files_content_str):
    """
    LLM을 활용해 프론트엔드/UI 파일들을 분석하여 라우팅 트리, 디자인 토큰, UI 컴포넌트 목록을 반환합니다.
    """
    system_prompt = """
    너는 시니어 프론트엔드 개발자야. 제공된 프론트엔드/UI 파일들을 분석하여 라우팅 트리, 디자인 토큰, UI 컴포넌트 목록을 분석해줘.
    중요: 하나의 레포지토리에 있는 모든 데이터를 생략되는 것 없이 최대한 많이 추출해서 응답해야 해.
    반드시 다음 JSON 배열 형태로만 응답해. 각 객체는 다음 열로만 구성되어야 해:
    repo_name, file_path, space_id, created_at, element_type, name, description, extra_info

    - element_type: "ROUTING", "DESIGN_TOKEN", "COMPONENT" 중 하나로 분류
    - extra_info: 해당 요소와 관련된 추가 정보 (라우팅 경로, 컴포넌트 Props, 색상 코드 등)

    [
      {
        "repo_name": "레포지토리 이름",
        "file_path": "해당 파일 경로",
        "space_id": null,
        "created_at": "현재 시간(ISO 8601)",
        "element_type": "ROUTING",
        "name": "Login",
        "description": "사용자 로그인 페이지 컴포넌트",
        "extra_info": "경로: /login"
      },
      {
        "repo_name": "레포지토리 이름",
        "file_path": "해당 파일 경로",
        "space_id": null,
        "created_at": "현재 시간(ISO 8601)",
        "element_type": "COMPONENT",
        "name": "Button",
        "description": "재사용 가능한 UI 버튼",
        "extra_info": "Props: size, color, onClick"
      }
    ]
    """
    
    response = call_gemini_with_retry(
        model_name='gemini-3.5-flash',
        contents=f"레포지토리: {repo_name}\n\n파일 내용들:\n{files_content_str}",
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,
            response_mime_type="application/json"
        ),
        view_name="Interface View"
    )
    
    if not response:
        return []
        
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return []

# ============================================================
# Interface Analysis Pipeline (interface_analyzer.py 통합)
# ============================================================

def _get_supabase_client() -> SupabaseClient:
    """
    환경 변수에서 Supabase URL과 KEY를 가져와 클라이언트를 초기화합니다.
    """
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("치명적 오류: Supabase 환경 변수(SUPABASE_URL, SUPABASE_KEY)가 설정되지 않았습니다.")
        
    return create_client(supabase_url, supabase_key)

def extract_component_metadata(project_path: str) -> list:
    """
    프로젝트 경로 내의 .tsx, .jsx, .vue 파일들을 스캔하여
    @figma 및 @storybook 주석을 추출합니다.
    """
    component_metadata = []
    
    # 정규식 패턴: // @figma: url 또는 /* @figma: url */
    figma_pattern = re.compile(r'@figma:\s*(https?://[^\s]+)')
    storybook_pattern = re.compile(r'@storybook:\s*(https?://[^\s]+)')
    
    for root, dirs, files in os.walk(project_path):
        # node_modules 등 제외
        if 'node_modules' in root or '.git' in root or 'dist' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.jsx', '.vue')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        figma_match = figma_pattern.search(content)
                        storybook_match = storybook_pattern.search(content)
                        
                        if figma_match or storybook_match:
                            # 파일명에서 확장자를 제외한 이름을 기본 컴포넌트 이름으로 사용
                            component_name = os.path.splitext(file)[0]
                            if component_name == 'index':
                                component_name = os.path.basename(root)
                                
                            metadata = {
                                "component_name": component_name,
                                "file_path": os.path.relpath(file_path, project_path).replace("\\", "/"),
                                "figma_url": figma_match.group(1) if figma_match else None,
                                "storybook_url": storybook_match.group(1) if storybook_match else None
                            }
                            component_metadata.append(metadata)
                except Exception as e:
                    logger.warning(f"파일 읽기 실패 {file_path}: {e}")
                    
    return component_metadata

def analyze_project_ui(project_path: str) -> Dict[str, Any]:
    """
    주어진 프로젝트 폴더를 탐색하여 라우팅 구조와 디자인 토큰을 추출합니다.
    (실제 복잡한 AI 분석 로직, 정규식, AST 파싱 등은 이 부분에 구현되며, 현재는 모킹 처리됨)
    """
    logger.info(f"프로젝트 분석 시작 (경로: {project_path})")
    
    # [가상 로직 1] 라우팅 구조 분석
    routing_data = {
        "name": "root",
        "path": "/",
        "children": [
            {
                "name": "Dashboard",
                "path": "/dashboard",
                "children": [
                    {
                        "name": "Settings",
                        "path": "/dashboard/settings",
                        "children": []
                    }
                ]
            },
            {
                "name": "Login",
                "path": "/login",
                "children": []
            }
        ]
    }
    
    # [가상 로직 2] 디자인 토큰 추출
    design_data = {
        "colors": {
            "primary": "#3B82F6",
            "secondary": "#6B7280",
            "background": "#FAFAFA"
        },
        "typography": {
            "base_font": "Inter, sans-serif"
        }
    }
    
    # 실제 주석 파싱 로직 실행
    component_metadata = extract_component_metadata(project_path)
    
    return {
        "raw_routing": routing_data,
        "raw_design": design_data,
        "component_metadata": component_metadata
    }

def format_interface_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    추출된 로우 데이터를 프론트엔드가 렌더링하기 좋은 [지정된 출력 JSON 포맷]으로 변환(정형화)합니다.
    """
    logger.info("추출된 데이터를 출력 JSON 포맷 스펙에 맞게 가공합니다.")
    
    try:
        routing_tree = raw_data.get("raw_routing", {})
        design_tokens = raw_data.get("raw_design", {})
        
        formatted_data = {
            "routing_tree": {
                "name": routing_tree.get("name", "Root"),
                "path": routing_tree.get("path", "/"),
                "children": routing_tree.get("children", [])
            },
            "design_tokens": {
                "colors": {
                    "primary": design_tokens.get("colors", {}).get("primary", "#000000"),
                    "secondary": design_tokens.get("colors", {}).get("secondary", "#FFFFFF"),
                    "background": design_tokens.get("colors", {}).get("background", "#FFFFFF")
                },
                "typography": {
                    "base_font": design_tokens.get("typography", {}).get("base_font", "sans-serif")
                }
            },
            "components": raw_data.get("component_metadata", [])
        }
        return formatted_data
    except Exception as e:
        logger.error(f"데이터 포맷팅 중 오류 발생: {str(e)}")
        raise

def save_interface_to_supabase(space_id: int, interface_data: Dict[str, Any]):
    """
    가공 완료된 JSON 데이터를 Supabase 'analysis_results' 테이블에 저장(Upsert)합니다.
    """
    logger.info(f"Supabase DB 저장 시작 (space_id: {space_id})")
    
    try:
        supabase = _get_supabase_client()
        
        data = {
            "space_id": space_id,
            "interface_view_data": interface_data
        }
        
        response = supabase.table("analysis_results").upsert(data).execute()
        
        if hasattr(response, 'error') and response.error:
             raise Exception(response.error)
             
        logger.info(f"Supabase 저장 성공. 완료된 데이터 수: {len(response.data) if response.data else 0}")
        return response
    except Exception as e:
        logger.error(f"Supabase 저장 중 예외 발생: {str(e)}")
        raise

def run_interface_analysis_pipeline(space_id: int, project_path: str):
    """
    전체 Interface 분석 파이프라인을 실행하는 오케스트레이션(메인) 함수.
    1. 프로젝트 파일 분석 및 추출
    2. 추출된 데이터 정형화
    3. 데이터베이스 저장
    """
    try:
        logger.info(f"--- Interface 분석 파이프라인 시작 (Space ID: {space_id}) ---")
        
        # 1. 프로젝트 파일 분석 및 추출
        raw_data = analyze_project_ui(project_path)
        
        # 2. 추출된 데이터 정형화
        formatted_json = format_interface_data(raw_data)
        
        # 3. 데이터베이스 저장
        save_interface_to_supabase(space_id, formatted_json)
        
        logger.info("--- Interface 분석 파이프라인 완료 ---")
        return formatted_json
        
    except Exception as e:
        logger.error(f"파이프라인 실행 중 치명적 오류 발생: {str(e)}")
        raise

def analyze_data_view(repo_name: str, file_paths: list) -> list:
    """
    Data View용 파일 경로 리스트를 받아, Data의 열 구조에 맞게 반환합니다.
    LLM 분석 없이 파일 경로를 기반으로 목록을 생성합니다.
    """
    import datetime
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    results = []
    for path in file_paths:
        results.append({
            "repo_name": repo_name,
            "file_path": path,
            "file_name": os.path.basename(path),
            "space_id": None,
            "created_at": now_str
        })

    logger.info(f"[Data View] '{repo_name}' 파일 변환 완료: 총 {len(results)}건")
    return results

def analyze_process_view(repo_name, files_content_str):
    system_prompt = """
    너는 DevOps 엔지니어야. CI/CD 파이프라인, Docker, 인프라 설정 파일들을 분석하여 파이프라인 흐름도를 그려줘.
    중요: 하나의 레포지토리에 있는 모든 데이터를 생략되는 것 없이 최대한 많이 추출해서 응답해야 해.
    반드시 다음 JSON 배열 형태로 응답해. 각 객체는 다음 열로만 구성되어야 해:
    repo_name, file_path, space_id, created_at, element_type, name, description, tech_stack, env_vars

    - element_type: "STEP" 으로 고정 (각 파이프라인 단계를 의미함)

    [
      {
        "repo_name": "레포지토리 이름",
        "file_path": "해당 파일 경로",
        "space_id": null,
        "created_at": "현재 시간(ISO 8601)",
        "element_type": "STEP",
        "name": "Build Project",
        "description": "프로젝트 빌드 단계",
        "tech_stack": "Gradle, Java 17",
        "env_vars": "None"
      }
    ]
    """
    
    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=f"레포지토리: {repo_name}\n\n파일 내용들:\n{files_content_str}",
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,
            response_mime_type="application/json"
        )
    )
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return []