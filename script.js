document.addEventListener('DOMContentLoaded', () => {
    // Particle.js config...
    particlesJS('particles-js', { particles: { number: { value: 80, density: { enable: true, value_area: 800 } }, color: { value: "#ffffff" }, shape: { type: "circle" }, opacity: { value: 0.5, random: false }, size: { value: 3, random: true }, line_linked: { enable: true, distance: 150, color: "#e50914", opacity: 0.4, width: 1 }, move: { enable: true, speed: 4, direction: "none", random: false, straight: false, out_mode: "out" } }, interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" } }, modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } } }, retina_detect: true });

    // === START: NEW WELCOME MODAL LOGIC ===
    const welcomeModalOverlay = document.getElementById('welcome-modal-overlay');
    const welcomeContinueBtn = document.getElementById('welcome-continue-btn');

    // Show the modal only if it hasn't been shown in this session
    if (!sessionStorage.getItem('welcomeModalShown')) {
        welcomeModalOverlay.classList.add('active');
        sessionStorage.setItem('welcomeModalShown', 'true');
    }

    function closeWelcomeModal() {
        welcomeModalOverlay.classList.remove('active');
    }

    welcomeContinueBtn.addEventListener('click', closeWelcomeModal);
    welcomeModalOverlay.addEventListener('click', (e) => {
        // Close only if the overlay itself (the dark background) is clicked
        if (e.target === welcomeModalOverlay) {
            closeWelcomeModal();
        }
    });
    // === END: NEW WELCOME MODAL LOGIC ===


    // DOM Elements
    const bypassForm = document.getElementById('bypass-form');
    const urlInput = document.getElementById('url-input');
    const bypassBtn = document.getElementById('bypass-btn');
    const resultBox = document.getElementById('result-box');
    const resultOutput = document.getElementById('result-output');
    const resultActions = document.getElementById('result-actions');
    
    // CAPTCHA Modal Elements
    const captchaModalOverlay = document.getElementById('captcha-modal-overlay');
    const captchaModal = document.getElementById('captcha-modal');
    const captchaQuestion = document.getElementById('captcha-question');
    const captchaInput = document.getElementById('captcha-input');
    const captchaSubmitBtn = document.getElementById('captcha-submit-btn');
    const captchaError = document.getElementById('captcha-error');

    // API Config from config.js
    const primaryApi = API_CONFIG.primary;
    const secondaryApi = API__CONFIG.secondary;

    let captchaAnswer = 0;
    
    // --- CAPTCHA Logic ---
    function generateCaptcha() {
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 20) + 1;
        captchaAnswer = num1 + num2;
        captchaQuestion.textContent = `${num1} + ${num2} = ?`;
        captchaInput.value = '';
        captchaError.textContent = '';
        captchaInput.focus();
    }

    // --- Form Submission Logic ---
    bypassForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!urlInput.value.trim()) {
            displayResult('Please enter a valid URL.', true);
            return;
        }
        generateCaptcha();
        captchaModalOverlay.classList.add('active');
    });

    // --- CAPTCHA Verification ---
    function handleCaptchaSubmit() {
         const userAnswer = parseInt(captchaInput.value, 10);
        if (userAnswer === captchaAnswer) {
            captchaModalOverlay.classList.remove('active');
            executeBypass(urlInput.value.trim());
        } else {
            captchaError.textContent = 'Incorrect. Please try this new problem.';
            captchaModal.classList.add('shake');
            setTimeout(() => captchaModal.classList.remove('shake'), 500);
            generateCaptcha();
        }
    }
    
    captchaSubmitBtn.addEventListener('click', handleCaptchaSubmit);
    captchaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCaptchaSubmit();
        }
    });


    // --- Core Bypass Function ---
    async function executeBypass(urlToBypass) {
        bypassBtn.disabled = true;
        bypassBtn.textContent = 'Bypassing...';
        resultBox.classList.remove('visible');
        displayResult('Processing your request...', false);

        try {
            // 1. Try Primary API
            const encodedUrl = encodeURIComponent(urlToBypass);
            const response = await fetch(primaryApi.url + encodedUrl, { method: primaryApi.method, headers: { 'x-api-key': primaryApi.apiKey } });
            if (!response.ok) throw new Error(`Primary API failed: ${response.status}`);
            const data = await response.json();
            if (data.result) {
                displayResult(data.result, false);
            } else { throw new Error('Primary API returned no result.'); }
        } catch (primaryError) {
            console.warn(primaryError.message, 'Trying fallback API.');
            try {
                // 2. Try Secondary (Fallback) API
                const response = await fetch(secondaryApi.url + urlToBypass, { method: secondaryApi.method, headers: { 'x-api-key': secondaryApi.apiKey } });
                if (!response.ok) throw new Error(`Secondary API also failed: ${response.status}`);
                const data = await response.json();
                if (data.result) {
                    displayResult(data.result, false);
                } else { displayResult('Both APIs failed to return a valid result.', true); }
            } catch (secondaryError) {
                console.error(secondaryError.message);
                displayResult('An unexpected error occurred with both APIs.', true);
            }
        } finally {
            bypassBtn.disabled = false;
            bypassBtn.textContent = 'Bypass';
        }
    }

    // --- Helper Functions ---
    function displayResult(message, isError) {
        resultBox.classList.add('visible');
        resultOutput.textContent = message;
        resultActions.innerHTML = ''; 

        if (isError) {
            resultOutput.classList.add('error');
            const retryBtn = createButton('Retry', 'btn-primary', () => bypassForm.requestSubmit());
            resultActions.appendChild(retryBtn);
        } else {
            resultOutput.classList.remove('error');
            if (isValidHttpUrl(message)) {
                const redirectBtn = createButton('Redirect', 'btn-primary', () => window.location.href = message);
                const copyBtn = createButton('Copy', 'btn-secondary', (e) => copyToClipboard(message, e.target));
                resultActions.appendChild(copyBtn);
                resultActions.appendChild(redirectBtn);
            } else {
                const copyBtn = createButton('Copy', 'btn-primary', (e) => copyToClipboard(message, e.target));
                resultActions.appendChild(copyBtn);
            }
        }
    }
    
    function createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `action-btn ${className}`;
        button.addEventListener('click', onClick);
        return button;
    }

    function isValidHttpUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) { return false; }
    }

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'Copied!';
            buttonElement.style.backgroundColor = 'var(--success-green)';
            buttonElement.style.borderColor = 'var(--success-green)';
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.backgroundColor = '';
                buttonElement.style.borderColor = '';
            }, 2000);
        }).catch(err => console.error('Failed to copy text: ', err));
    }
});
