"""
ai_analyzer.py — NVIDIA NIM AI integration for resume analysis
Uses meta/llama-3.1-70b-instruct via OpenAI-compatible NVIDIA endpoint
"""
import json
import os
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Initialise NVIDIA NIM client
client = OpenAI(
    base_url=NVIDIA_BASE_URL,
    api_key=NVIDIA_API_KEY,
)

SYSTEM_PROMPT = """You are an expert ATS analyst. Analyze the resume against the target role and return a precise JSON assessment. Return ONLY valid JSON. No talk or markers."""

def build_analysis_prompt(resume_text: str, job_role: str) -> str:
    return f"""Target Role: {job_role}
Resume: {resume_text[:5000]}

Output JSON:
{{
  "score": 0-100,
  "match_pct": 0-100,
  "tier": "Expert"|"Advanced"|"Intermediate"|"Beginner",
  "rank_text": "One sentence summary",
  "skills": ["List of 8-10 present skills"],
  "missing": ["List of 3-5 missing keys"],
  "suggestions": [
    {{"title": "Action", "desc": "1-2 sentences advice"}},
    {{"title": "Action", "desc": "1-2 sentences advice"}},
    {{"title": "Action", "desc": "1-2 sentences advice"}}
  ]
}}"""


def extract_json_from_response(text: str) -> dict:
    """Robustly extract JSON from AI response even if there's surrounding text."""
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in the response
    json_patterns = [
        r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # nested one level
        r'\{.*\}',  # greedy match
    ]
    for pattern in json_patterns:
        matches = re.findall(pattern, text, re.DOTALL)
        for match in reversed(matches):  # try longest match first
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue

    raise ValueError("Could not extract valid JSON from AI response")


def validate_and_normalize(data: dict, job_role: str) -> dict:
    """Ensure all required fields exist and are valid types."""
    score = int(data.get("score", 70))
    match_pct = int(data.get("match_pct", 75))
    tier = data.get("tier", "Advanced")
    if tier not in ("Expert", "Advanced", "Intermediate", "Beginner"):
        tier = "Advanced"

    skills = data.get("skills", [])
    if not isinstance(skills, list):
        skills = []

    missing = data.get("missing", [])
    if not isinstance(missing, list):
        missing = []

    suggestions = data.get("suggestions", [])
    if not isinstance(suggestions, list):
        suggestions = []

    normalized_suggestions = []
    for s in suggestions[:3]:
        normalized_suggestions.append({
            "title": str(s.get("title", "Improve Resume")),
            "desc": str(s.get("desc", "Focus on improving this section.")),
        })

    rank_text = data.get("rank_text", f"Your profile is a solid candidate for {job_role} roles.")

    return {
        "score": max(0, min(100, score)),
        "match_pct": max(0, min(100, match_pct)),
        "tier": tier,
        "rank_text": rank_text,
        "skills": [str(s) for s in skills[:12]],
        "missing": [str(s) for s in missing[:6]],
        "suggestions": normalized_suggestions,
    }


def keyword_fallback(resume_text: str, job_role: str) -> dict:
    """Simple keyword-based fallback if AI call fails."""
    text_lower = resume_text.lower()
    role_lower = job_role.lower()

    # Common tech skills
    all_skills = {
        "python": "Python", "javascript": "JavaScript", "java": "Java",
        "react": "React", "node": "Node.js", "sql": "SQL", "aws": "AWS",
        "docker": "Docker", "git": "Git", "typescript": "TypeScript",
        "html": "HTML", "css": "CSS", "c++": "C++", "go": "Go",
        "mongodb": "MongoDB", "postgresql": "PostgreSQL", "redis": "Redis",
        "kubernetes": "Kubernetes", "terraform": "Terraform", "linux": "Linux",
        "machine learning": "Machine Learning", "tensorflow": "TensorFlow",
        "pytorch": "PyTorch", "pandas": "Pandas", "excel": "Excel",
        "tableau": "Tableau", "figma": "Figma", "agile": "Agile",
    }

    detected = [label for key, label in all_skills.items() if key in text_lower][:10]
    word_count = len(resume_text.split())
    score = min(85, 40 + len(detected) * 3 + (10 if word_count > 300 else 0))
    match_pct = min(90, score + 5)

    tier = "Expert" if score >= 85 else "Advanced" if score >= 70 else "Intermediate" if score >= 55 else "Beginner"

    return {
        "score": score,
        "match_pct": match_pct,
        "tier": tier,
        "rank_text": f"Your resume shows {len(detected)} relevant skills for {job_role} roles.",
        "skills": detected or ["Communication", "Problem Solving", "Teamwork"],
        "missing": ["Quantified Achievements", "Industry Certifications", "Technical Keywords", "Portfolio Links"],
        "suggestions": [
            {
                "title": "Add Metrics",
                "desc": "Include specific numbers and percentages to quantify your achievements. Recruiters and ATS systems prioritize measurable impact over vague descriptions.",
                "link": "Smart Editor",
            },
            {
                "title": "Keyword Alignment",
                "desc": f"Your resume may be missing key terms from {job_role} job descriptions. Match your language directly to common job postings for this role.",
                "link": "View Examples",
            },
            {
                "title": "Format Check",
                "desc": "Ensure your resume uses a single-column layout with standard fonts. ATS systems often reject complex designs with tables, graphics, or unusual formatting.",
                "link": "Preview Changes",
            },
        ],
    }


async def analyze_resume(resume_text: str, job_role: str) -> dict:
    """
    Main entry point — analyze resume with NVIDIA NIM AI.
    Falls back to keyword scoring if AI call fails.
    """
    if not resume_text or len(resume_text.strip()) < 50:
        raise ValueError("Resume text is too short or could not be extracted properly.")

    try:
        print(f"🤖 Calling NVIDIA NIM ({NVIDIA_MODEL}) for role: {job_role}")

        response = client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_analysis_prompt(resume_text, job_role)},
            ],
            temperature=0.1,
            max_tokens=1024,
        )

        raw_content = response.choices[0].message.content
        print(f"✅ AI response received ({len(raw_content)} chars)")

        parsed = extract_json_from_response(raw_content)
        result = validate_and_normalize(parsed, job_role)
        print(f"📊 Score: {result['score']}, Match: {result['match_pct']}%, Tier: {result['tier']}")
        return result

    except Exception as e:
        print(f"⚠️  AI call failed: {e}. Using keyword fallback.")
        return keyword_fallback(resume_text, job_role)
