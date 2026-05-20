import os
import logging
import re
from typing import Dict, Any

# dotenv 라이브러리 추가
from dotenv import load_dotenv
# 로컬 개발 환경용 .env 로드
load_dotenv()

# supabase-py 라이브러리 필요: pip install supabase
from supabase import create_client, Client

# 로깅 설정 (상용 환경 모니터링을 위해)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
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
    # ex: src/pages, app/ 등 라우팅 폴더 내 파일 구조를 읽고,
    # React Router, Next.js App/Pages Router 구조를 트리 형태로 추출
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
    # ex: tailwind.config.js, globals.css, theme.ts 등을 정규식/AST로 파싱하여 주요 색상, 폰트 추출
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
    
    # [추가] 실제 주석 파싱 로직 실행
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
        
        # 엄격한 포맷 스펙 준수
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

def save_to_supabase(space_id: int, interface_data: Dict[str, Any]):
    """
    가공 완료된 JSON 데이터를 Supabase 'analysis_results' 테이블에 저장(Upsert)합니다.
    """
    logger.info(f"Supabase DB 저장 시작 (space_id: {space_id})")
    
    try:
        supabase = get_supabase_client()
        
        # upsert: space_id가 이미 존재하면 해당 row를 update하고, 없으면 새로 insert 합니다.
        # (테이블 생성 시 space_id가 PK 혹은 Unique 제약조건으로 설정되어 있어야 완벽히 동작합니다)
        data = {
            "space_id": space_id,
            "interface_view_data": interface_data
        }
        
        # Supabase API 호출
        response = supabase.table("analysis_results").upsert(data).execute()
        
        # 에러 체크 및 결과 반환
        if hasattr(response, 'error') and response.error:
             raise Exception(response.error)
             
        logger.info(f"Supabase 저장 성공. 완료된 데이터 수: {len(response.data) if response.data else 0}")
        return response
    except Exception as e:
        logger.error(f"Supabase 저장 중 예외 발생: {str(e)}")
        raise

def run_interface_analysis_pipeline(space_id: int, project_path: str):
    """
    전체 Interface 분석 파이프라인을 실행하는 오케스트레이션(메인) 함수
    """
    try:
        logger.info(f"--- Interface 분석 파이프라인 시작 (Space ID: {space_id}) ---")
        
        # 1. 프로젝트 파일 분석 및 추출
        raw_data = analyze_project_ui(project_path)
        
        # 2. 추출된 데이터 정형화
        formatted_json = format_interface_data(raw_data)
        
        # 3. 데이터베이스 저장
        save_to_supabase(space_id, formatted_json)
        
        logger.info("--- Interface 분석 파이프라인 완료 ---")
        return formatted_json
        
    except Exception as e:
        logger.error(f"파이프라인 실행 중 치명적 오류 발생: {str(e)}")
        # 필요 시 외부 큐(Queue) 상태 변경이나 백엔드(Spring)로의 실패 콜백 API를 호출할 수 있습니다.
        raise

# 예제 실행 구문
if __name__ == "__main__":
    # 로컬 테스트용 더미 데이터
    test_space_id = 1
    test_project_path = "/path/to/cloned/repo"
    
    # 환경변수 모킹 (실제 실행 시엔 OS 환경변수로 주입됨)
    if not os.environ.get("SUPABASE_URL"):
        os.environ["SUPABASE_URL"] = "https://your-project.supabase.co"
    if not os.environ.get("SUPABASE_KEY"):
        os.environ["SUPABASE_KEY"] = "your-supabase-service-role-key"
        
    try:
        # 주석 해제 시 실제 로컬 테스트가 진행됩니다.
        # run_interface_analysis_pipeline(test_space_id, test_project_path)
        pass
    except Exception as e:
        print(f"테스트 실패: {e}")
