# AI-Powered ITSM & Intelligent Helpdesk Automation Platform

## Overview

The AI-Powered ITSM & Intelligent Helpdesk Automation Platform is a web-based solution designed to simplify IT support operations through AI-assisted incident analysis, automated troubleshooting and knowledge retrieval.

The platform helps employees report IT issues and enables support teams to review incidents, identify possible root causes and access relevant troubleshooting recommendations.

## Key Features

- **Employee Self-Service Portal:** Submit IT support requests and track issues.
- **ITSM Dashboard:** View and manage incidents and service requests.
- **AI Analysis & Incident Triage:** Analyse incident descriptions and generate suggested classifications, priorities and troubleshooting guidance.
- **Knowledge Base & RAG:** Search relevant IT knowledge articles and retrieve contextual information for common support problems.
- **Auto-Resolution & Self-Healing:** Explore automated remediation workflows and resolution simulations.
- **Software Provisioning:** Support software request and provisioning workflows.

## Technology Stack

- **Frontend:** React, JavaScript, HTML and CSS
- **Backend:** Python, FastAPI
- **Database:** MongoDB Atlas
- **AI Integration:** AI-assisted incident analysis and knowledge retrieval
- **Development Tools:** Visual Studio Code, Node.js and Python

## Project Structure

```text
pract/
├── backend/       # Backend application
├── frontend/      # Frontend application
├── src/           # Application source files
├── data/          # Project data and supporting files
├── package.json   # Node.js project configuration
└── README.md      # Project documentation
```

## Setup and Installation

### Prerequisites

- Python 3.10 or a compatible version required by the project
- Node.js and npm
- MongoDB Atlas access, if required by the configured backend

### Backend Setup

Open a terminal in the backend directory.

```bash
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies listed in the project's requirements file.

```bash
pip install -r requirements.txt
```

Start the FastAPI server using the actual application module configured in the project. For example, if the entry point is `main.py`:

```bash
uvicorn main:app --reload
```

### Frontend Setup

Open another terminal in the directory containing the frontend's `package.json`.

```bash
npm install
npm run dev
```

Use the local URL displayed by the development server.

*Confirm the actual dependency files, scripts, entry point and required environment variables before following these commands.*

## AI Analysis and Knowledge Retrieval

The platform provides AI-assisted incident triage and troubleshooting recommendations. Its knowledge retrieval functionality is intended to surface relevant documentation for common IT support issues.

AI-generated classifications and recommendations should be reviewed by the support team before any consequential remediation is performed.

## Configuration and Security

- Store API keys, database credentials and other secrets in environment variables.
- Do not commit `.env` files or credentials to a public repository.
- Provide a safe `.env.example` containing placeholder values where configuration documentation is needed.
- Do not include real employee information or sensitive production data in sample datasets.

## Testing

Before submission, verify that:

- The frontend starts successfully.
- The backend starts without errors.
- Database connectivity works when configured.
- Incident creation and retrieval work as expected.
- AI analysis returns appropriate results when the required AI service is configured.
- Knowledge base search works.
- Errors are handled gracefully when a service is unavailable.

## Future Enhancements

- Improve incident correlation and anomaly detection.
- Expand the knowledge base and retrieval evaluation.
- Integrate with external ITSM platforms such as ServiceNow.
- Add monitoring, auditability and additional automated remediation workflows.

## Author

Developed as an AI-powered IT Service Management and intelligent helpdesk automation project.
