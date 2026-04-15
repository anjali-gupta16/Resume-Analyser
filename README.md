# ResumeAI — AI-Powered Resume Analyzer
“Transform your resume into an opportunity magnet.”

ResumeAI is a premium, high-performance web application designed to help job seekers optimize their resumes for Applicant Tracking Systems (ATS). Using state-of-the-art AI (NVIDIA NIM / Llama 3.1), it analyzes resumes against specific job roles to provide scores, skill gap analysis, and actionable improvement paths.

![ResumeAI Preview](https://via.placeholder.com/1200x600?text=ResumeAI+Dashboard+Preview)

## 🚀 Features

- **Instant AI Analysis**: Upload PDF/DOCX resumes and get a deep technical assessment in seconds.
- **ATS Compatibility Scoring**: Understand how well your resume matches target industry standards.
- **Skill Gap Detection**: Automatically identifies missing keywords and critical skills for your target role.
- **Strategic Improvement Path**: Personalized recommendations to enhance your candidacy.
- **Premium Dark UI**: A sleek, glassmorphic interface with smooth animations and real-time feedback.
- **Analysis History**: Keep track of all your past resume versions and their scores.
- **Privacy First**: Secure local processing with options to delete your history at any time.

## 🛠️ Tech Stack

### Frontend
- **Logic**: Vanilla JavaScript (ES6+)
- **Styling**: Vanilla CSS (Custom tokens, Grid, Flexbox)
- **Icons**: Custom SVG system
- **Animations**: CSS Keyframes & Staggered Reveals

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **AI Engine**: NVIDIA NIM (Meta Llama 3.1 8B Instruct)
- **Database**: SQLite with SQLAlchemy ORM
- **Parsing**: `pypdf` for PDF & `python-docx` for Office docs

## ⚙️ Setup & Installation

### 1. Prerequisites
- Python 3.9 or higher
- An NVIDIA NIM API Key (Available at [NVIDIA Build](https://build.nvidia.com/))

### 2. Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` folder:
   ```env
   NVIDIA_API_KEY=your_api_key_here
   NVIDIA_MODEL=meta/llama-3.1-8b-instruct
   DATABASE_URL=sqlite:///./resume_analyser.db
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE_MB=10
   ```

### 3. Running the Application
You can start both the backend and frontend using the convenience script:
```bash
./backend/start.bat
```
Alternatively, start the FastAPI server manually:
```bash
cd backend
uvicorn main:app --reload --port 8000
```
Then open `http://localhost:8000` in your browser.

## 📂 Project Structure

```
├── backend/
│   ├── main.py           # FastAPI application & API routes
│   ├── ai_analyzer.py    # AI logic & Prompt Engineering
│   ├── resume_parser.py  # Text extraction (PDF/DOCX)
│   ├── database.py       # SQL Alchemy models
│   ├── requirements.txt  # Python dependencies
│   └── start.bat         # Startup script
├── index.html            # Main UI structure
├── styles.css            # Premium design system
├── app.js               # Frontend application logic
└── uploads/              # Temporary storage for resumes
```

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements.

## 📄 License
© 2026 RESUMEAI. THE CURATED ARCHITECT.
Licensed under the MIT License.
