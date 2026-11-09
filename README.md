# AI-Powered ITSM & Intelligent Helpdesk Automation Platform

## Overview

The **AI-Powered ITSM & Intelligent Helpdesk Automation Platform** is a web-based application designed to streamline IT support operations through AI-assisted incident analysis, intelligent knowledge retrieval, automated troubleshooting, and service request management.

The platform enables employees to report IT issues through a self-service portal while helping IT support teams analyse incidents, identify potential root causes, prioritize issues, and access relevant troubleshooting recommendations.

## Key Features

### 1. Employee Self-Service Portal

- Submit IT incidents and service requests.
- Track submitted requests and their status.
- Interact with the AI-powered support chatbot.
- Receive assistance for common IT problems.

### 2. ITSM Dashboard

- View and manage incidents and service requests.
- Monitor incident status, priority, and classification.
- Review incident information and support activities.

### 3. AI Analysis & Incident Triage

- Analyse employee-reported incident descriptions.
- Classify incidents using **Hugging Face Zero-Shot Classification**.
- Suggest relevant incident categories without requiring a dedicated classifier trained on predefined categories.
- Generate AI-assisted priority suggestions and troubleshooting guidance.
- Identify potential causes and support incident triage.

### 4. Knowledge Base & Retrieval-Augmented Generation (RAG)

- Maintain IT troubleshooting articles and knowledge documents.
- Search relevant knowledge articles based on incident descriptions.
- Retrieve contextual information using document chunking and embeddings.
- Provide knowledge-based troubleshooting recommendations.

### 5. Auto-Resolution & Self-Healing

- Explore automated incident remediation workflows.
- Simulate troubleshooting and resolution actions.
- Provide retry options when automated resolution fails.
- Support incident escalation to IT teams when necessary.

### 6. Software Request & Provisioning

- Allow employees to submit software installation requests.
- Track software request status.
- Demonstrate software provisioning through simulated workflows.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, JavaScript, HTML, CSS, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | MongoDB Atlas |
| AI & Machine Learning | Hugging Face Zero-Shot Classification |
| Knowledge Retrieval | RAG, document chunking, embeddings, vector-based retrieval |
| Development Tools | Visual Studio Code, Node.js, Python |

## System Architecture

- **Frontend:** React-based interface for employees and IT support teams.
- **Backend:** FastAPI provides REST API endpoints.
- **Database:** MongoDB Atlas stores application data when configured and connected.
- **AI Analysis Layer:** Hugging Face Zero-Shot Classification supports incident categorization and triage.
- **Knowledge Retrieval Layer:** RAG-based retrieval identifies relevant IT documentation.
- **Automation Layer:** Demonstrates incident remediation and service request workflows.
- **Integration Layer:** Uses simulated integrations for selected ITSM workflows.

## Project Structure

```text
pract/
├── backend/       # FastAPI backend application
├── frontend/      # Frontend application
├── src/           # Application source files
├── data/          # Project data and supporting files
├── package.json   # Node.js project configuration
└── README.md      # Project documentation

### Installation & Setup

### Prerequisites

* Python 3.10 or compatible version

* Node.js and npm

* MongoDB Atlas account and configuration, if required

### 1\. Clone the Repository

```bash
git clone <your-repository-url>
cd pract
```

### 2\. Backend Setup

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server if the entry point is `main.py`:

```bash
uvicorn main:app --reload
```

FastAPI documentation:

[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs?utm_source=chatgpt.com)

### 3\. Frontend Setup

Navigate to the directory containing the frontend `package.json`.

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal.

> Confirm your actual backend entry point, frontend directory, and npm scripts before running these commands.

### AI Analysis & Incident Classification

The platform uses Hugging Face Zero-Shot Classification to analyse employee-reported IT incidents and suggest relevant incident categories.

Zero-shot classification enables the model to classify incident descriptions into candidate categories without requiring a dedicated classifier trained specifically on those categories.

### AI Capabilities

* Zero-Shot Incident Classification: Classifies incident descriptions into relevant IT incident categories.

* Priority Assessment: Supports AI-assisted incident priority suggestions.

* Incident Analysis: Analyses reported issues and identifies potential causes.

* Troubleshooting Recommendations: Provides suggested troubleshooting steps.

AI-generated classifications and recommendations should be reviewed by IT support personnel before consequential remediation actions.

### Knowledge Retrieval & RAG

The Knowledge Base module supports troubleshooting through relevant IT documentation.

The retrieval workflow:

* Processes knowledge documents.

* Splits documents into smaller chunks.

* Generates embeddings for knowledge retrieval.

* Retrieves relevant information based on incident descriptions.

* Provides contextual troubleshooting recommendations.

### ServiceNow Integration

The platform demonstrates ITSM workflows using a simulated ServiceNow adapter.

The current implementation focuses on demonstrating incident management, automated troubleshooting, and service request workflows.

A live ServiceNow integration can be introduced in a future version using official ServiceNow APIs and appropriate authentication.

### Configuration & Security

* Store API keys and database credentials in environment variables.

* Never commit sensitive credentials or `.env` files to GitHub.

* Use a `.env.example` file to document configuration variables.

* Avoid using sensitive employee information or production data in test environments.

* Validate and handle API errors appropriately.

* Review AI-generated recommendations before executing remediation workflows.

### Testing

* Frontend application starts successfully.

* Backend API starts without errors.

* Database connectivity works when configured.

* Incident creation and retrieval function correctly.

* Hugging Face Zero-Shot Classification returns appropriate classifications.

* AI analysis provides relevant recommendations.

* Knowledge Base search retrieves relevant articles.

* RAG-based retrieval provides contextual troubleshooting information.

* Automated remediation workflows handle failures appropriately.

* Software request workflows function correctly.

* Error handling and escalation workflows work as expected.

### Future Enhancements

* Integrate with live ServiceNow APIs.

* Improve incident correlation and anomaly detection.

* Expand knowledge base coverage and retrieval accuracy.

* Improve AI classification accuracy and evaluation.

* Introduce advanced incident analytics and monitoring.

* Enhance automated remediation workflows.

* Implement role-based access control and audit logging.

* Improve AI-assisted incident prioritization.

