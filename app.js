// ===========================
// Resume Analyzer — Frontend
// Connects to FastAPI backend at localhost:8000
// ===========================

(function () {
    'use strict';

    // Update this URL after you deploy to Railway
    const PRODUCTION_API_URL = 'https://resume-analyser-production-10b2.up.railway.app/api';

    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000/api'
        : PRODUCTION_API_URL;

    // --- State ---
    let selectedFile = null;
    let uploadedFileId = null;
    let currentAnalysis = null;

    // --- DOM Elements ---
    const pageLanding  = document.getElementById('pageLanding');
    const pageResults  = document.getElementById('pageResults');
    const dropzone     = document.getElementById('dropzone');
    const fileInput    = document.getElementById('fileInput');
    const fileInfo     = document.getElementById('fileInfo');
    const fileName     = document.getElementById('fileName');
    const fileRemoveBtn= document.getElementById('fileRemoveBtn');
    const jobRoleSelect= document.getElementById('jobRoleSelect');
    const analyzeBtn   = document.getElementById('analyzeBtn');
    const heroUploadBtn= document.getElementById('heroUploadBtn');
    const heroHowBtn   = document.getElementById('heroHowBtn');
    const reuploadBtn  = document.getElementById('reuploadBtn');
    const downloadBtn  = document.getElementById('downloadBtn');
    const analyzingOverlay = document.getElementById('analyzingOverlay');
    const uploadProgress   = document.getElementById('uploadProgress');
    const progressFill     = document.getElementById('progressFill');
    const progressText     = document.getElementById('progressText');
    const progressPercent  = document.getElementById('progressPercent');
    const navbar       = document.getElementById('navbar');
    const navLogo      = document.getElementById('nav-logo');
    const customSelect  = document.getElementById('customSelect');
    const selectTrigger = document.getElementById('selectTrigger');
    const selectOptions = document.getElementById('selectOptions');
    const triggerText   = document.getElementById('selectTriggerText');

    // Results DOM
    const scoreRingProgress = document.getElementById('scoreRingProgress');
    const scoreNum      = document.getElementById('scoreNum');
    const scoreTier     = document.getElementById('scoreTier');
    const scoreRankText = document.getElementById('scoreRankText');
    const matchRole     = document.getElementById('matchRole');
    const matchNum      = document.getElementById('matchNum');
    const matchBarFill  = document.getElementById('matchBarFill');
    const matchAccuracy = document.getElementById('matchAccuracy');
    const skillsTags    = document.getElementById('skillsTags');
    const missingTags   = document.getElementById('missingTags');
    const suggestionsGrid = document.getElementById('suggestionsGrid');

    // ─────────────────────────────────────────
    // Page Navigation
    // ─────────────────────────────────────────
    // ─────────────────────────────────────────
    // Page Navigation
    // ─────────────────────────────────────────
    function showPage(id) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(id);
        if (targetPage) {
            targetPage.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Re-run animation check for the new page
            setupScrollReveal();
        }

        // Update nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            if (linkPage === 'home' && id === 'pageLanding') {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    navLogo.addEventListener('click', e => {
        e.preventDefault();
        showPage('pageLanding');
    });

    heroUploadBtn.addEventListener('click', () => {
        document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('getStartedBtn') &&
        document.getElementById('getStartedBtn').addEventListener('click', () => {
            document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
        });

    heroHowBtn.addEventListener('click', () => {
        document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' });
    });

    reuploadBtn.addEventListener('click', () => {
        resetUploadState();
        showPage('pageLanding');
        setTimeout(() => {
            document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
        }, 300);
    });

    // ─────────────────────────────────────────
    // Navbar scroll effect
    // ─────────────────────────────────────────
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    });

    // ─────────────────────────────────────────
    // Auth Modal (Login / Sign Up)
    // ─────────────────────────────────────────
    const authModal     = document.getElementById('authModal');
    const authClose     = document.getElementById('authClose');
    const authForm      = document.getElementById('authForm');
    const authTitle     = document.getElementById('authTitle');
    const authSubtitle  = document.getElementById('authSubtitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSwitchBtn = document.getElementById('authSwitchBtn');
    let isSignUpMode = false;

    function openAuthModal() {
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeAuthModal() {
        authModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function toggleAuthMode(e) {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        
        if (isSignUpMode) {
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Enter your details to get started with ResumeAI';
            authSubmitBtn.textContent = 'Sign Up';
            authSwitchBtn.textContent = 'Log In';
            document.querySelector('.auth-switch').childNodes[0].textContent = 'Already have an account? ';
        } else {
            authTitle.textContent = 'Welcome Back';
            authSubtitle.textContent = 'Enter your details to access your account';
            authSubmitBtn.textContent = 'Log In';
            authSwitchBtn.textContent = 'Sign Up';
            document.querySelector('.auth-switch').childNodes[0].textContent = "Don't have an account? ";
        }
    }

    document.getElementById('loginBtn') && document.getElementById('loginBtn').addEventListener('click', openAuthModal);
    authClose.addEventListener('click', closeAuthModal);
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    authSwitchBtn.addEventListener('click', toggleAuthMode);

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const mode = isSignUpMode ? 'Account created' : 'Logged in';
        showToast(`${mode} successfully!`, 'success');
        setTimeout(closeAuthModal, 600);
    });

    // ─────────────────────────────────────────
    // Reset upload state
    // ─────────────────────────────────────────
    function resetUploadState() {
        selectedFile = null;
        uploadedFileId = null;
        fileInfo.style.display = 'none';
        document.querySelector('.dropzone-content').style.display = '';
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
        jobRoleSelect.value = '';
        if (triggerText) triggerText.textContent = 'Select a role...';
        document.querySelectorAll('.select-option').forEach(el => el.classList.remove('selected'));
        analyzeBtn.disabled = false;
        analyzeBtn.style.opacity = '1';
        fileInput.value = '';
    }

    // ─────────────────────────────────────────
    // Drag & Drop + File Selection
    // ─────────────────────────────────────────
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ];
        const isValidExt = /\.(pdf|docx|doc)$/i.test(file.name);

        if (!validTypes.includes(file.type) && !isValidExt) {
            showToast('Please upload a PDF or DOCX file.', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size must be under 10MB.', 'error');
            return;
        }

        selectedFile = file;
        uploadedFileId = null; // reset — need to re-upload
        fileName.textContent = file.name;
        fileInfo.style.display = 'inline-flex';
        document.querySelector('.dropzone-content').style.display = 'none';
    }

    fileRemoveBtn.addEventListener('click', e => {
        e.stopPropagation();
        resetUploadState();
    });

    // ─────────────────────────────────────────
    // Analyze Button — full flow
    // ─────────────────────────────────────────
    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showToast('Please upload your resume first.', 'warning');
            return;
        }
        if (!jobRoleSelect.value) {
            showToast('Please select a target job role.', 'warning');
            return;
        }

        // Check backend is running
        const alive = await checkBackendHealth();
        if (!alive) {
            showToast('Backend server is not running. Please start backend/start.bat first.', 'error');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.style.opacity = '0.6';

        try {
            // Step 1: Upload file
            uploadedFileId = await uploadFile(selectedFile);

            // Step 2: Show analyzing overlay
            showAnalyzingOverlay();

            // Step 3: AI Analysis (runs during overlay)
            const result = await runAnalysis(uploadedFileId, jobRoleSelect.value);
            currentAnalysis = result;

            // Step 4: Hide overlay, show results
            analyzingOverlay.classList.remove('show');
            populateResults(result);
            showPage('pageResults');
            animateResults(result);

        } catch (err) {
            analyzingOverlay.classList.remove('show');
            console.error('Analysis error:', err);
            showToast(err.message || 'Analysis failed. Please try again.', 'error');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.style.opacity = '1';
        }
    });

    // ─────────────────────────────────────────
    // API Calls
    // ─────────────────────────────────────────

    async function checkBackendHealth() {
        try {
            const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
            return res.ok;
        } catch {
            return false;
        }
    }

    async function uploadFile(file) {
        // Show upload progress
        uploadProgress.style.display = 'block';
        progressText.textContent = 'Uploading...';

        // Fake smooth progress up to 90% while uploading
        let fakeProgress = 0;
        const fakeInterval = setInterval(() => {
            fakeProgress = Math.min(90, fakeProgress + Math.random() * 12 + 4);
            setProgress(fakeProgress, 'Uploading...');
        }, 180);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData,
            });

            clearInterval(fakeInterval);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Upload failed (${res.status})`);
            }

            const data = await res.json();
            setProgress(100, 'Upload complete!');
            await sleep(400);

            return data.file_id;

        } catch (err) {
            clearInterval(fakeInterval);
            uploadProgress.style.display = 'none';
            progressFill.style.width = '0%';
            throw err;
        }
    }

    async function runAnalysis(fileId, jobRole) {
        const res = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileId, job_role: jobRole }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Analysis failed (${res.status})`);
        }

        return res.json();
    }

    function setProgress(pct, label) {
        progressFill.style.width = pct + '%';
        progressText.textContent = label;
        progressPercent.textContent = Math.round(pct) + '%';
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ─────────────────────────────────────────
    // Analyzing Overlay with Step Animation
    // ─────────────────────────────────────────
    function showAnalyzingOverlay() {
        const steps = [
            document.getElementById('aStep1'),
            document.getElementById('aStep2'),
            document.getElementById('aStep3'),
            document.getElementById('aStep4'),
        ];

        steps.forEach(s => { s.className = 'a-step'; });
        steps[0].classList.add('done');
        steps[1].classList.add('active');

        analyzingOverlay.classList.add('show');

        // Animate steps at intervals (visual only — real work happens in parallel)
        let idx = 1;
        const iv = setInterval(() => {
            if (idx >= steps.length) { clearInterval(iv); return; }
            steps[idx].classList.remove('active');
            steps[idx].classList.add('done');
            idx++;
            if (steps[idx]) steps[idx].classList.add('active');
        }, 300);
    }

    // ─────────────────────────────────────────
    // Populate Results Page
    // ─────────────────────────────────────────
    function populateResults(data) {
        // Role label
        const roleOption = jobRoleSelect.options[jobRoleSelect.selectedIndex];
        matchRole.textContent = roleOption ? roleOption.textContent : data.job_role;

        // Skills tags
        skillsTags.innerHTML = (data.skills || [])
            .map(s => `<span class="skill-tag">${s}</span>`)
            .join('');

        // Missing skills tags
        missingTags.innerHTML = (data.missing || [])
            .map(s => `<span class="skill-tag">${s}</span>`)
            .join('');

        // Suggestion cards
        suggestionsGrid.innerHTML = (data.suggestions || [])
            .map((s, i) => buildSuggestionCard(s, i))
            .join('');

        // Store values for animation
        pageResults.dataset.score    = data.score;
        pageResults.dataset.matchPct = data.match_pct;
        pageResults.dataset.tier     = data.tier;
        pageResults.dataset.rankText = data.rank_text || '';
    }

    function buildSuggestionCard(s, index) {
        const colors = ['blue', 'purple', 'slate'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const icon = getSuggestionIcon(s.title, color);
        const staggerClass = index < 4 ? `stagger-${index + 1}` : '';
        return `
        <div class="suggestion-card reveal ${staggerClass}">
            <div class="suggestion-icon ${color}">${icon}</div>
            <h3>${s.title}</h3>
            <p>${s.desc}</p>
        </div>`;
    }

    function getSuggestionIcon(title, color) {
        const t = (title || '').toLowerCase();
        const stroke = color === 'blue' ? '#3b82f6' : color === 'purple' ? '#8b5cf6' : '#64748b';
        if (t.includes('metric') || t.includes('impact') || t.includes('quantif')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
        }
        if (t.includes('verb') || t.includes('action') || t.includes('bullet') || t.includes('language')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        }
        if (t.includes('format') || t.includes('layout') || t.includes('design')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`;
        }
        if (t.includes('keyword') || t.includes('ats') || t.includes('scan')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
        }
        if (t.includes('skill') || t.includes('tech') || t.includes('certif')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
        }
        if (t.includes('portfolio') || t.includes('project') || t.includes('link')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        }
        // Default
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    }

    // ─────────────────────────────────────────
    // Animate Results (numbers, ring, bar)
    // ─────────────────────────────────────────
    function animateResults(data) {
        const targetScore = parseInt(pageResults.dataset.score) || 75;
        const targetMatch = parseInt(pageResults.dataset.matchPct) || 85;
        const tier        = pageResults.dataset.tier || 'Advanced';
        const rankText    = pageResults.dataset.rankText || '';

        // Score ring — circumference for r=56: 2*PI*56 = 351.86
        const circumference = 2 * Math.PI * 56;
        const offset = circumference - (targetScore / 100) * circumference;
        setTimeout(() => {
            scoreRingProgress.style.strokeDashoffset = offset;
        }, 100);

        // Animate score number
        animateCounter(scoreNum, 0, targetScore, 1500);

        // Tier label
        setTimeout(() => { scoreTier.textContent = tier; }, 900);

        // Rank text
        setTimeout(() => {
            if (rankText) {
                scoreRankText.innerHTML = rankText.replace(
                    /top (\d+%)/i,
                    'top <strong>$1</strong>'
                );
            }
        }, 1000);

        // Match number + bar
        animateCounter(matchNum, 0, targetMatch, 1500);
        setTimeout(() => { matchBarFill.style.width = targetMatch + '%'; }, 200);

        // Accuracy label
        setTimeout(() => {
            matchAccuracy.textContent =
                targetMatch >= 90 ? 'EXCELLENT MATCH' :
                targetMatch >= 80 ? 'HIGH ACCURACY' :
                targetMatch >= 65 ? 'GOOD ALIGNMENT' : 'MODERATE FIT';
        }, 1200);

        // Scroll-fade suggestion cards
        setupScrollReveal();
    }

    function animateCounter(el, from, to, duration) {
        const start = performance.now();
        function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(from + (to - from) * eased);
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ─────────────────────────────────────────
    // Download Report
    // ─────────────────────────────────────────
    downloadBtn.addEventListener('click', () => {
        if (!currentAnalysis) {
            showToast('No analysis data to download.', 'warning');
            return;
        }
        const roleOption = jobRoleSelect.options[jobRoleSelect.selectedIndex];
        const roleName = roleOption ? roleOption.textContent : currentAnalysis.job_role;
        const txt = buildReportText(currentAnalysis, roleName);
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ResumeAI_Report_${roleName.replace(/\s+/g, '_')}_#${currentAnalysis.analysis_id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Report downloaded!', 'success');
    });

    /**
     * Set up IntersectionObserver for scroll-reveal animations
     */
    function setupScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal');
        
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Once animated, we can stop observing it
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Handle navbar scroll effect
     */
    function handleNavbarScroll() {
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Initialize Animations
    setupScrollReveal();

    function buildReportText(data, roleName) {
        const line = '═'.repeat(52);
        const thin = '─'.repeat(52);
        const rows = [
            line,
            '        ResumeAI — AI Analysis Report',
            line,
            '',
            `📄 File        : ${data.filename}`,
            `🎯 Target Role : ${roleName}`,
            `🆔 Analysis ID : #${data.analysis_id}`,
            `📅 Date        : ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
            `🤖 AI Model    : NVIDIA NIM — meta/llama-3.1-70b-instruct`,
            '',
            thin,
            '  SCORES',
            thin,
            `  Resume Score  : ${data.score}/100  (${data.tier})`,
            `  Job Match     : ${data.match_pct}%`,
            `  Assessment    : ${data.rank_text || ''}`,
            '',
            thin,
            '  SKILLS DETECTED',
            thin,
            ...(data.skills || []).map(s => `  ✅ ${s}`),
            '',
            thin,
            '  MISSING CRITICAL SKILLS',
            thin,
            ...(data.missing || []).map(s => `  ⚠️  ${s}`),
            '',
            thin,
            '  IMPROVEMENT SUGGESTIONS',
            thin,
            '',
            ...(data.suggestions || []).flatMap((s, i) => [
                `  ${i + 1}. ${s.title}`,
                `     ${s.desc}`,
                '',
            ]),
            line,
            '  Powered by ResumeAI + NVIDIA NIM',
            line,
        ];
        return rows.join('\n');
    }

    // ─────────────────────────────────────────
    // Scroll Fade-In Animations
    // ─────────────────────────────────────────
    function observeFadeIn() {
        const els = document.querySelectorAll(
            '.feature-card, .step-card, .dash-card, .suggestion-card, .deep-analysis-card'
        );
        els.forEach(el => el.classList.add('fade-in'));

        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

        els.forEach(el => io.observe(el));
    }

    observeFadeIn();

    // ─────────────────────────────────────────
    // Toast Notifications
    // ─────────────────────────────────────────
    function showToast(message, type = 'info') {
        document.querySelectorAll('.toast').forEach(t => t.remove());

        const colors = {
            error:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
            warning: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
            success: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
            info:    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
        };
        const c = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 28px;
            left: 50%;
            transform: translateX(-50%) translateY(16px);
            padding: 12px 22px;
            background: ${c.bg};
            color: ${c.text};
            border: 1px solid ${c.border};
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            font-family: var(--font);
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
            z-index: 3000;
            opacity: 0;
            transition: all 0.25s ease;
            max-width: 340px;
            text-align: center;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(16px)';
            setTimeout(() => toast.remove(), 280);
        }, type === 'error' ? 4500 : 3000);
    }

    // ─────────────────────────────────────────
    // Backend Status Indicator (top banner)
    // ─────────────────────────────────────────
    async function checkAndShowBackendStatus() {
        const isOnline = await checkBackendHealth();
        if (!isOnline) {
            const banner = document.createElement('div');
            banner.id = 'backendBanner';
            banner.style.cssText = `
                position: fixed;
                top: 60px;
                left: 0; right: 0;
                z-index: 999;
                background: #fffbeb;
                border-bottom: 1px solid #fde68a;
                color: #92400e;
                font-size: 12px;
                font-weight: 600;
                font-family: 'Courier New', monospace;
                text-align: center;
                padding: 8px 16px;
                letter-spacing: 0.3px;
            `;
            banner.innerHTML = `
                ⚠ BACKEND OFFLINE — Run <code style="background:#fef3c7;padding:2px 6px;border-radius:4px;">backend/start.bat</code> 
                to enable AI analysis &nbsp;|&nbsp; 
                <a href="http://localhost:8000/docs" target="_blank" style="color:#2563eb;text-decoration:underline;">API Docs</a>
            `;
            document.body.appendChild(banner);
        } else {
            console.log('✅ ResumeAI backend is online at', API_BASE);
        }
    }

    // ─────────────────────────────────────────
    // Custom Select Initialization
    // ─────────────────────────────────────────
    function initCustomSelect() {
        if (!selectOptions) return;
        selectOptions.innerHTML = '';
        Array.from(jobRoleSelect.options).forEach(opt => {
            if (!opt.value) return; 
            const div = document.createElement('div');
            div.className = 'select-option';
            div.textContent = opt.textContent;
            div.dataset.value = opt.value;
            div.addEventListener('click', () => {
                jobRoleSelect.value = opt.value;
                triggerText.textContent = opt.textContent;
                document.querySelectorAll('.select-option').forEach(el => {
                    el.classList.toggle('selected', el.dataset.value === opt.value);
                });
                customSelect.classList.remove('active');
            });
            selectOptions.appendChild(div);
        });
    }

    if (selectTrigger) {
        selectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            customSelect.classList.toggle('active');
        });
    }

    document.addEventListener('click', () => {
        if (customSelect) customSelect.classList.remove('active');
    });

    // ─────────────────────────────────────────
    // Legal & Support Modals
    // ─────────────────────────────────────────
    const legalModal = document.getElementById('legalModal');
    const legalTitle = document.getElementById('legalTitle');
    const legalBody  = document.getElementById('legalBody');
    const legalClose = document.getElementById('legalClose');

    const legalContent = {
        privacy: {
            title: 'Privacy Policy',
            content: `
                <p>Welcome to ResumeAI. Your privacy is critically important to us.</p>
                <h4>1. Information We Collect</h4>
                <p>We only collect the resumes you upload for the purpose of analysis. This data is processed securely and is not shared with third parties for marketing purposes.</p>
                <h4>2. Data Usage</h4>
                <p>Uploaded documents are analyzed using NVIDIA NIM AI models. We store a record of the analysis results (score, skills, suggestions) in our local database for your future reference.</p>
                <h4>3. Security</h4>
                <p>We use industry-standard encryption and security measures to protect your data. However, please remember that no method of transmission over the internet is 100% secure.</p>
                <h4>4. Data Retention</h4>
                <p>You can delete your analysis history at any time using the delete button in the history panel.</p>
            `
        },
        terms: {
            title: 'Terms of Service',
            content: `
                <p>By using ResumeAI, you agree to the following terms:</p>
                <h4>1. Use of Service</h4>
                <p>This application is provided for professional development and resume optimization purposes. You are responsible for the content of the resumes you upload.</p>
                <h4>2. AI Accuracy</h4>
                <p>Analysis and suggestions are generated by AI models. While we strive for high accuracy, ResumeAI does not guarantee employment or specific hiring outcomes.</p>
                <h4>3. Intellectual Property</h4>
                <p>The application, design, and code are property of RESUMEAI. Users retain ownership of their uploaded resumes.</p>
                <h4>4. Limitation of Liability</h4>
                <p>RESUMEAI is not liable for any direct or indirect damages resulting from the use or inability to use the service.</p>
            `
        },
        support: {
            title: 'Contact Support',
            content: `
                <p>Need help or have suggestions? Our team is ready to assist you.</p>
                <div class="support-grid">
                    <div class="support-item">
                        <div class="support-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </div>
                        <div class="support-info">
                            <h3>Email Support</h3>
                            <p>support@resumeai.demo</p>
                        </div>
                    </div>
                    <div class="support-item">
                        <div class="support-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <div class="support-info">
                            <h3>Live Chat</h3>
                            <p>Available Mon-Fri, 9am - 5pm EST</p>
                        </div>
                    </div>
                </div>
                <p style="margin-top: 24px; font-size: 12px; color: var(--text-muted);">Typical response time is less than 24 hours.</p>
            `
        }
    };

    function openLegalModal(type) {
        if (!legalContent[type]) return;
        legalTitle.textContent = legalContent[type].title;
        legalBody.innerHTML = legalContent[type].content;
        legalModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeLegalModal() {
        legalModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    document.getElementById('footerPrivacy').addEventListener('click', (e) => {
        e.preventDefault();
        openLegalModal('privacy');
    });

    document.getElementById('footerTerms').addEventListener('click', (e) => {
        e.preventDefault();
        openLegalModal('terms');
    });

    document.getElementById('footerSupport').addEventListener('click', (e) => {
        e.preventDefault();
        openLegalModal('support');
    });

    legalClose.addEventListener('click', closeLegalModal);
    legalModal.addEventListener('click', (e) => {
        if (e.target === legalModal) closeLegalModal();
    });

    initCustomSelect();

})();
