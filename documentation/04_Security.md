# 📄 PRISM LEARNING AI
## Document 4: Security & Privacy (PRD)

### 1. DATA OWNERSHIP & ZERO-RETENTION POLICY
*   **Intellectual Property:** Students and educators retain 100% ownership of the materials they upload (PPTs, PDFs). 
*   **No Model Training:** We explicitly state in our application that user uploads and chat histories are **never** used to train base AI models. 
*   **Vendor Compliance:** We utilize the Fireworks AI API for inference. Standard enterprise API agreements dictate that request payload data (prompts/context) is not retained for training purposes.

### 2. STORAGE & DATABASE SECURITY
*   **Row Level Security (RLS):** Our Supabase PostgreSQL database implements strict RLS. A user can *only* query and read `workspaces` and `flashcards` tied to their specific authenticated `user_id`.
*   **Ephemeral File Processing:** When a user uploads a `.pptx` or `.mp4`, the file is stored in a secure Supabase S3 bucket. Once the Python backend extracts the text and creates the Master Reviewer JSON, the original uploaded file is permanently deleted from the bucket to save storage costs and protect user privacy.

### 3. AUTHENTICATION (Clerk)
*   User authentication is handled by Clerk, providing enterprise-grade security, brute-force protection, and secure JWT (JSON Web Token) session management.
*   We only collect the user's Google Account email and name; no secondary PII (Personally Identifiable Information) is required or stored.

### 4. AI SAFETY GUARDRAILS (Prompt Injection)
*   **System Prompt Isolation:** User inputs (`student_message`) are strictly separated from the System Instructions.
*   **Rejection Triggers:** The `[MODE: TUTOR]` prompt includes explicit instructions to refuse requests that attempt to extract the system prompt, generate harmful content, or ask the AI to "write my essay for me" (Academic Dishonesty guardrail).