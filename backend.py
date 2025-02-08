from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import queue
import threading
import requests
import time
from typing import List, Dict, Any, TypedDict
from langgraph.graph import StateGraph, END, START
from concurrent.futures import ThreadPoolExecutor
from openai import AzureOpenAI
import urllib3
from datetime import datetime
import re
import os


# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests
session_queues = {}

def create_event_queue():
    return queue.Queue()

# Suppress SSL verification warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def log_step(step_name: str, details: str = None, queue_id=None):
    """Enhanced logging function that also sends events to frontend"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_data = {
        "timestamp": timestamp,
        "step": step_name,
        "details": details,
        "type": "log"
    }
    
    # Console logging
    print(f"\n[{timestamp}] 🔄 {step_name}")
    if details:
        print(f"    {details}")
    print("-" * 50)
    
    # If we have a queue_id, send to frontend
    if queue_id and queue_id in session_queues:
        session_queues[queue_id].put(log_data)

def stream_events(queue_id):
    """Generator function for SSE streaming"""
    if queue_id not in session_queues:
        return
    
    q = session_queues[queue_id]
    
    try:
        while True:
            try:
                data = q.get(timeout=30)  # 30 second timeout
                yield f"data: {json.dumps(data)}\n\n"
            except queue.Empty:
                # Send keepalive
                yield f"data: {json.dumps({'type': 'keepalive'})}\n\n"
    except GeneratorExit:
        # Clean up when client disconnects
        if queue_id in session_queues:
            del session_queues[queue_id]
import os
from python_dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("AZURE_OPENAI_API_KEY")
api_version = os.getenv("AZURE_API_VERSION")
azure_endpoint = os.getenv("AZURE_ENDPOINT")

# Azure OpenAI Setup
client = AzureOpenAI(
    api_key=api_key,
    api_version=api_version,
    azure_endpoint=azure_endpoint
)

def invoke_azure_openai(prompt: str, model: str = "gpt-4o-mini") -> str:
    """Invoke Azure OpenAI for inference."""
    log_step("Azure OpenAI Request", f"Model: {model}")
    try:
        start_time = time.time()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant for Vanguard."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.7
        )
        duration = time.time() - start_time
        result = response.choices[0].message.content
        log_step("Azure OpenAI Response", f"Duration: {duration:.2f}s\nLength: {len(result)} chars")
        return result
    except Exception as e:
        log_step("Azure OpenAI Error", f"Error: {str(e)}")
        return ""

def invoke_azure_openai_generate(prompt: str, model: str = "gpt-4o") -> str:
    """Invoke Azure OpenAI for inference."""
    log_step("Azure OpenAI Request", f"Model: {model}")
    try:
        start_time = time.time()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": """
    You are an AI assistant for Vanguard that provides detailed answers to client queries using provided sources. Answer the following query comprehensively and cite your sources using the numbers provided.
                 
    Instructions:
    1. Provide your response in two sections:
       - A clear, concise answer that summarizes the key points
       - A detailed reasoning section that explains the answer with specific citations
    2. Use numbered citations in square brackets (e.g., [1], [2])
    3. Ensure all claims are supported by citations
    4. Use the exact format shown below

    Your response should be in the following format:

    <answer>
    [Direct, clear answer to the query with in line cittations]
    </answer>

    <reasoning>
    [Detailed explanation with specific citations to sources]
    </reasoning>
                 """},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.7
        )
        duration = time.time() - start_time
        result = response.choices[0].message.content
        log_step("Azure OpenAI Response", f"Duration: {duration:.2f}s\nLength: {len(result)} chars")
        return result
    except Exception as e:
        log_step("Azure OpenAI Error", f"Error: {str(e)}")
        return ""
    
# State Definitions
class QueryState(TypedDict):
    original_query: str
    sub_queries: List[str]
    retrieved_docs: Dict[str, List[Any]]
    answer: str

# Query Planning Layer
def query_optimizer(state: QueryState) -> Dict[str, List[str]]:
    """Uses Azure OpenAI to split queries into multiple sub-queries."""
    log_step("Query Optimization", f"Original query: {state['original_query']}")

    structured_llm_prompt = f"""
    Given the user's query, break it down into several specific questions that cover all aspects of the topic. Ensure the sub-queries are concise, non-overlapping, and collectively comprehensive.
    Format each sub-query on a new line.
    Query: {state['original_query']}
    """
    response = invoke_azure_openai(prompt=structured_llm_prompt)
    sub_queries = [q.strip() for q in response.strip().split("\n") if q.strip()][:3]

    log_step("Sub-queries Generated", f"Sub-queries: {sub_queries}")
    return {"sub_queries": sub_queries}

# Coveo Retrieval Layer
def get_bearer_token():
    """Retrieve a bearer token for authentication."""
    return "xxb22fae78-d7ec-4e73-8d6c-2feb81ce2670"

def query_coveo_api(query: str) -> Dict[str, Any]:
    """Query Coveo API to retrieve relevant documents."""
    log_step("Coveo API Request", f"Query: {query}")
    token = get_bearer_token()
    url = "https://thevanguardgroupproduction7s2cjlnv.org.coveo.com/rest/search/v2"
    headers = {
        "Accept": "*/*",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    }

    params = {
        "q": query,
        "locale": "en",
        "numberOfResults": 3,
        "sortCriteria": "relevancy",
        "enableDidYouMean": "true",
        "retrieveFirstSentences": "true",
        "excerptLength": 10000,
    }

    try:
        start_time = time.time()
        response = requests.get(url, headers=headers, params=params, verify=False)
        duration = time.time() - start_time
        response.raise_for_status()
        results = response.json()
        log_step("Coveo API Response",
                f"Duration: {duration:.2f}s\n"
                f"Results found: {len(results.get('results', []))}")
        return results
    except Exception as e:
        log_step("Coveo API Error", f"Error: {str(e)}")
        return {"results": []}

def parallel_retrieval(state: QueryState) -> Dict[str, Dict[str, List[Any]]]:
    """Retrieve results for multiple queries in parallel using Coveo."""
    log_step("Starting Parallel Retrieval", f"Processing {len(state['sub_queries'])} queries")
    retrieved_docs = {}

    with ThreadPoolExecutor(max_workers=len(state["sub_queries"])) as executor:
        future_to_query = {executor.submit(query_coveo_api, q): q for q in state["sub_queries"]}

        for future in future_to_query:
            query = future_to_query[future]
            try:
                results = future.result().get("results", [])
                retrieved_docs[query] = results
                log_step(
                    "Query Results",
                    f"Query: {query}\n"
                    f"Results found: {len(results)}"
                )
            except Exception as e:
                log_step("Retrieval Error", f"Query: {query}\nError: {str(e)}")
                retrieved_docs[query] = []

    # Deduplicate results based on a unique identifier (e.g., URL or title)
    log_step("Deduplicating Results", "Removing duplicate documents across all queries")
    seen_urls = set()
    deduplicated_results = []

    for query, results in retrieved_docs.items():
        for result in results:
            url = result.get('clickUri', '').strip()
            if url and url not in seen_urls:
                seen_urls.add(url)
                deduplicated_results.append(result)
            else:
                log_step("Duplicate Found", f"Duplicate URL: {url}")

    # Update the state with deduplicated results
    deduplicated_docs = {"combined_results": deduplicated_results}
    log_step(
        "Deduplication Complete",
        f"Total unique documents: {len(deduplicated_results)}"
    )
    return {"retrieved_docs": deduplicated_docs}

class Source(TypedDict):
    id: int
    title: str
    url: str
    excerpt: str

class QueryState(TypedDict):
    original_query: str
    sub_queries: List[str]
    retrieved_docs: Dict[str, List[Any]]
    answer: Dict[str, Any]  # Modified to store structured answer

def parse_llm_response(response: str) -> Dict[str, Any]:
    """Parse the LLM response into structured components."""
    # Extract answer section
    answer_match = re.search(r'<answer>(.*?)</answer>', response, re.DOTALL)
    answer_text = answer_match.group(1).strip() if answer_match else ""

    # Extract reasoning section
    reasoning_match = re.search(r'<reasoning>(.*?)</reasoning>', response, re.DOTALL)
    reasoning_text = reasoning_match.group(1).strip() if reasoning_match else ""

    return {
        "answer": answer_text,
        "reasoning": reasoning_text
    }

def generate_answer(state: QueryState) -> Dict[str, Dict[str, Any]]:
    """Generate a structured response with citations and sources."""
    log_step("Answer Generation", "Preparing context from retrieved documents")

    results = state['retrieved_docs'].get('combined_results', [])
    context_parts = []
    sources = []

    for idx, result in enumerate(results):
        excerpt = result.get('excerpt', '').strip()
        title = result.get('title', '').strip()
        url = result.get('clickUri', '').strip()

        if excerpt and title:
            source_id = idx + 1
            source_info: Source = {
                'id': source_id,
                'title': title,
                'url': url,
                'excerpt': excerpt
            }
            sources.append(source_info)
            context_parts.append(f"[{source_id}] {title}\nURL: {url}\nExcerpt: {excerpt}\n")

    combined_context = "\n".join(context_parts)

    prompt = f"""
    You are an AI assistant for Vanguard that provides detailed answers to client queries using provided sources. Answer the following query comprehensively and cite your sources using the numbers provided.

    Query: {state['original_query']}

    Sources:
    {combined_context}

    Instructions:
    1. Provide your response in two sections:
       - A clear, concise answer that summarizes the key points
       - A detailed reasoning section that explains the answer with specific citations
    2. Use numbered citations in square brackets (e.g., [1], [2])
    3. Ensure all claims are supported by citations
    4. Use the exact format shown below

    Your response should be in the following format:

    <answer>
    [Direct, clear answer to the query with in line cittations]
    </answer>

    <reasoning>
    [Detailed explanation with specific citations to sources]
    </reasoning>
    """

    raw_answer = invoke_azure_openai_generate(prompt=prompt)
    print('raw_answer', raw_answer)
    parsed_response = parse_llm_response(raw_answer)
    print('parsed response',parsed_response)
    # print('sources', sources)

    # Create structured response
    structured_response = {
        "content": {
            "answer": parsed_response["answer"],
            "reasoning": parsed_response["reasoning"]
        },
        "sources": sources
    }

    return {"answer": structured_response}

# Workflow Creation
def create_search_workflow() -> StateGraph:
    """Create and return a compiled search workflow."""
    log_step("Creating Search Workflow")
    workflow = StateGraph(QueryState)

    # Add nodes
    workflow.add_node("query_optimizer", query_optimizer)
    workflow.add_node("parallel_retrieval", parallel_retrieval)
    workflow.add_node("answer_generator", generate_answer)

    # Add edges with proper START and END
    workflow.add_edge(START, "query_optimizer")
    workflow.add_edge("query_optimizer", "parallel_retrieval")
    workflow.add_edge("parallel_retrieval", "answer_generator")
    workflow.add_edge("answer_generator", END)

    log_step("Workflow Created", "All nodes and edges configured")
    return workflow.compile()

@app.route('/stream', methods=['GET'])
def event_stream():
    """SSE endpoint for streaming workflow events"""
    queue_id = request.args.get('id')
    if not queue_id:
        return "Queue ID required", 400
        
    if queue_id not in session_queues:
        session_queues[queue_id] = create_event_queue()
    
    return Response(
        stream_events(queue_id),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


@app.route('/search', methods=['POST'])
def handle_search():
    """Enhanced endpoint for processing search queries with streaming updates"""
    data = request.get_json()

    if not data or 'query' not in data:
        return jsonify({"error": "Query parameter is required"}), 400

    queue_id = data.get('sessionId')  # Frontend should provide a session ID
    if not queue_id:
        return jsonify({"error": "Session ID is required"}), 400

    try:
        query = data['query']
        chain = create_search_workflow()
        
        # Create queue for this session if it doesn't exist
        if queue_id not in session_queues:
            session_queues[queue_id] = create_event_queue()
        
        # Modify the workflow functions to use the queue
        def enhanced_query_optimizer(state: QueryState):
            log_step("Breaking down query...", f"Analyzing: {state['original_query']}", queue_id)
            result = query_optimizer(state)
            log_step("Query breakdown complete", f"Generated {len(result['sub_queries'])} sub-queries", queue_id)
            log_step("Sub-queries", f"{result['sub_queries']}", queue_id)
            return result

        def enhanced_parallel_retrieval(state: QueryState):
            log_step("Searching for relevant documents...", None, queue_id)
            result = parallel_retrieval(state)
            log_step("Search complete", f"Found {len(result['retrieved_docs']['combined_results'])} documents", queue_id)
            return result

        def enhanced_generate_answer(state: QueryState):
            log_step("Generating comprehensive answer...", None, queue_id)
            result = generate_answer(state)
            log_step("Answer generation complete", "Response ready", queue_id)
            return result

        # Update workflow with enhanced functions
        workflow = StateGraph(QueryState)
        workflow.add_node("query_optimizer", enhanced_query_optimizer)
        workflow.add_node("parallel_retrieval", enhanced_parallel_retrieval)
        workflow.add_node("answer_generator", enhanced_generate_answer)

        workflow.add_edge(START, "query_optimizer")
        workflow.add_edge("query_optimizer", "parallel_retrieval")
        workflow.add_edge("parallel_retrieval", "answer_generator")
        workflow.add_edge("answer_generator", END)

        chain = workflow.compile()

        # Execute workflow
        initial_state = QueryState(
            original_query=query,
            sub_queries=[],
            retrieved_docs={},
            answer={}
        )

        final_state = chain.invoke(initial_state)

        response = {
            "status": "success",
            "query": query,
            "result": {
                "content": final_state["answer"]["content"],
                "sources": final_state["answer"]["sources"]
            }
        }

        return jsonify(response)

    except Exception as e:
        error_msg = f"Processing error: {str(e)}"
        log_step("Error", error_msg, queue_id)
        return jsonify({
            "status": "error",
            "error": error_msg
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)