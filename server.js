require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors'); // Add this line
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// Enable CORS for the Vercel deployment and localhost
app.use(cors({
  origin: ['https://devheat-hackathon.vercel.app', 'http://localhost:3000', '*'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));

const qaData = JSON.parse(fs.readFileSync('./data/question.js', 'utf8'));

// Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define allowed topics to strictly enforce boundaries
const allowedTopics = [
  'software development', 'programming', 'coding', 'javascript', 'python', 'java', 'c++', 'rust', 'go',
  'data structures', 'algorithms', 'complexity', 'big o', 
  'system design', 'architecture', 'microservices', 'databases', 'caching', 'load balancing',
  'interview process', 'technical interviews', 'coding interviews', 'behavioral interviews',
  'career development', 'tech industry', 'software engineering', 'web development',
  'frontend', 'backend', 'fullstack', 'devops', 'cloud', 'networking',
  'agile', 'scrum', 'kanban', 'sdlc', 'testing', 'ci/cd', 'version control',
  // Added topics
  'react', 'reactjs', 'react.js', 'nodejs', 'node.js', 'nextjs', 'next.js', 'typescript',
  'angular', 'vue', 'vuejs', 'vue.js', 'svelte', 'express', 'expressjs', 'express.js',
  'mongodb', 'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'api',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'serverless',
  'deployment', 'hosting', 'netlify', 'vercel', 'heroku', 'digital ocean', 'github pages',
  'webpack', 'babel', 'eslint', 'prettier', 'jest', 'testing library', 'cypress', 'selenium',
  'authentication', 'authorization', 'oauth', 'jwt', 'security', 'csrf', 'xss',
  'responsive design', 'mobile first', 'pwa', 'progressive web app', 'seo', 'accessibility'
];

app.post('/ask', async (req, res) => {
  try {
    if (!req.body || !req.body.question) {
      return res.status(400).json({ error: 'Missing required field: question' });
    }
    
    const { question } = req.body;
    const questionLower = question.toLowerCase().trim();
    
    // Handle greetings
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some(greeting => questionLower === greeting || questionLower.startsWith(greeting + ' '))) {
      return res.json({
        answer: "Hello! I am an AI interview assistant here to help you prepare for technical interviews. Feel free to ask me questions about software engineering, data structures, algorithms, or interview preparation.",
        source: 'greeting'
      });
    }
    
    // Handle questions about the application/platform
    const appKeywords = ['this app', 'this application', 'this platform', 'mockprep', 'mock prep', 'what is this', 'about this app'];
    if (appKeywords.some(keyword => questionLower.includes(keyword))) {
      return res.json({
        answer: "MockPrep is an AI-driven interview platform that prepares you to crack your dream job. It offers personalized question generation, real-time feedback, and progress tracking to help you excel in your interviews.",
        source: 'platform-info'
      });
    }
    
    // Handle resource questions
    const resourceKeywords = ['resource', 'material', 'learn', 'tutorial', 'documentation', 'guide', 'help me learn', 'how to prepare', 'study material'];
    if (resourceKeywords.some(keyword => questionLower.includes(keyword))) {
      return res.json({
        answer: "MockPrep offers tailored AI resource recommendations based on your skill level and target role. Check out our Resources section for curated tutorials, documentation, and practice problems. Don't forget to take advantage of our free mock tests that simulate real interview environments with personalized feedback to accelerate your preparation.",
        source: 'resource-info'
      });
    }
    
    // Handle mock test questions
    const mockTestKeywords = ['mock test', 'mock interview', 'practice test', 'simulation', 'test myself', 'practice interview', 'assessment'];
    if (mockTestKeywords.some(keyword => questionLower.includes(keyword))) {
      return res.json({
        answer: "MockPrep offers free mock interviews tailored to your experience level and target role. Our AI-powered platform provides realistic questions, evaluates your responses, and offers detailed feedback to help you improve. Simply select your desired role and experience level from the dashboard to start a personalized mock interview session with real-time evaluation.",
        source: 'mock-test-info'
      });
    }
    
    // Handle tech stack questions
    const techStackKeywords = ['tech stack', 'development stack', 'technology stack', 'stack', 'technology used', 'framework', 'programming language'];
    if (techStackKeywords.some(keyword => questionLower.includes(keyword))) {
      return res.json({
        answer: "For software development roles, common tech stacks include: MERN (MongoDB, Express, React, Node.js) for JavaScript-based web applications, LAMP (Linux, Apache, MySQL, PHP) for traditional web services, Java Spring with React for enterprise applications, Python Django/Flask with modern frontend frameworks for data-driven applications, and cloud-native solutions using AWS/Azure/GCP services with containerization technologies like Docker and Kubernetes. The best stack depends on the specific requirements of the position and company you're interviewing with.",
        source: 'tech-stack-info'
      });
    }
    
    // Continue with the existing topic checking
    const containsProhibitedTerms = [
      'who are you', 'what are you', 'your name', 'gemini', 'ai model', 'trained on',
      'who made you', 'your creator', 'political', 'religion', 'opinion', 'feeling',
      'personal', 'tell me about yourself', 'your thoughts', 'do you like', 
      'do you feel', 'are you ai', 'chatbot', 'language model'
    ].some(term => questionLower.includes(term));
    
    const isRelevantQuestion = allowedTopics.some(topic => 
      questionLower.includes(topic) || 
      questionLower.includes(topic.replace(' ', ''))
    );
    
    if (containsProhibitedTerms || (!isRelevantQuestion && questionLower.length > 15)) {
      return res.json({
        answer: "I'm an interview preparation assistant focused on technical topics. I can help with software engineering concepts, data structures, algorithms, system design, and interview preparation. Please ask a question related to these areas.",
        source: 'boundary-enforced'
      });
    }
    
    function findTopMatches(query, limit = 8) {
      const queryLower = query.toLowerCase();
      const words = queryLower.split(/\W+/).filter(word => word.length > 2);
      
      const queryWordMap = {};
      words.forEach(word => { queryWordMap[word] = true; });
      
      return qaData
        .map(item => {
          const questionLower = item.question.toLowerCase();
          const questionWords = questionLower.split(/\W+/).filter(word => word.length > 2);
          
          let score = 0;
          
          questionWords.forEach(word => {
            if (queryWordMap[word]) score += 3;
            if (queryLower.includes(word)) score += 2;
          });
          
          if (questionLower.includes(queryLower)) score += 10;
          
          if (queryLower.includes(item.category.toLowerCase())) score += 5;
          if (queryLower.includes(item.topic.toLowerCase())) score += 5;
          
          return {
            ...item,
            score
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }
    
    const topMatches = findTopMatches(question);
    const maxScore = topMatches.length > 0 ? topMatches[0].score : 0;
    
    const useDatasetAnswers = maxScore > 5;
    
    let prompt;
    
    if (useDatasetAnswers) {
      prompt = `
You are a specialized interview preparation assistant for MockPrep, an AI-driven interview platform that helps users prepare for technical interviews.

Here are relevant interview Q&A pairs:

${topMatches.map((item, i) => 
  `${i + 1}. Category: ${item.category}
     Q: ${item.question}
     A: ${item.answer}`
).join("\n\n")}

User's question: "${question}"

Strict instructions (you must follow these exactly):
1. Answer ONLY based on the knowledge base information above
2. Use a professional, factual tone - no jokes, emotions, or personal opinions
3. Do not mention yourself or refer to being an AI/model/assistant
4. If multiple entries are relevant, synthesize a comprehensive answer
5. Include technical examples when appropriate
6. If the question is unclear or not covered by the knowledge base, respond ONLY with: "I don't have enough information about this specific technical topic. Please ask about software engineering, data structures, algorithms, or interview preparation."
7. Never answer questions about yourself, your capabilities, your training data, or non-technical topics
8. Never apologize or use phrases like "I'm an AI" or "As an assistant"
9. Focus exclusively on factual technical information
10. When appropriate, encourage users to explore MockPrep's features like AI resource recommendations and free mock tests

Provide a clear, accurate, and helpful response.
`;
    } else {
      prompt = `
You are a specialized interview preparation assistant for MockPrep, an AI-driven interview platform that helps users prepare for technical interviews.

User's question: "${question}"

About the MockPrep platform:
- It offers personalized question generation based on user's experience, job role and target companies
- Provides AI-driven real-time feedback on interview responses
- Features a dashboard for tracking progress and identifying areas for improvement
- Includes company-specific interview preparation resources
- Offers free mock tests with adaptive recommendations

Strict instructions (you must follow these exactly):
1. Answer ONLY if the question is about software engineering, programming, data structures, algorithms, system design, technical interviews, or tech career topics
2. Use a professional, factual tone - no jokes, emotions, or personal opinions
3. Do not mention yourself or refer to being an AI/model/assistant
4. Include technical examples when appropriate
5. If the question is about a specific company's interview process, provide general guidance about typical industry practices
6. If the question is unclear or outside your scope (not related to technology or interviews), respond ONLY with: "I don't have enough information about this specific technical topic. Please ask about software engineering, data structures, algorithms, or interview preparation."
7. Never answer questions about yourself, your capabilities, your training data, or non-technical topics
8. Never apologize or use phrases like "I'm an AI" or "As an assistant"
9. Focus exclusively on factual technical information
10. When appropriate, encourage users to explore MockPrep's features like AI resource recommendations and free mock tests

Provide a clear, accurate, and helpful response.
`;
    }
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Reduced temperature for more focused responses
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 800,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      });
      
      let reply = result.response.text();
      
      // Post-process to remove any potential self-references
      const selfReferences = [
        "As an AI", "as an AI", "I'm an AI", "I am an AI", 
        "As a language model", "as a language model",
        "I'm a", "I am a", "I'm not", "I am not",
        "I don't have", "I do not have", "I cannot", "I can't",
        "my knowledge", "my training", "my capabilities",
        "I'd recommend", "I would recommend", "I suggest",
        "In my view", "In my opinion", "I believe", "I think"
      ];
      
      for (const ref of selfReferences) {
        // Replace with domain-appropriate alternatives
        if (reply.includes(ref)) {
          reply = reply.replace(new RegExp(ref, "gi"), "Professional advice is to");
        }
      }
      
      // Add a subtle reference to MockPrep features when appropriate
      if (reply.toLowerCase().includes("prepare") || 
          reply.toLowerCase().includes("practice") || 
          reply.toLowerCase().includes("learn") ||
          reply.toLowerCase().includes("study")) {
        
        const mockPrepSuggestions = [
          "For more practice on this topic, check out MockPrep's personalized resources and free mock tests.",
          "MockPrep's practice tests can help reinforce this concept with personalized feedback.",
          "To apply this knowledge, try MockPrep's AI-driven mock interviews tailored to your experience level."
        ];
        
        const randomSuggestion = mockPrepSuggestions[Math.floor(Math.random() * mockPrepSuggestions.length)];
        
        if (!reply.toLowerCase().includes("mockprep")) {
          reply = `${reply}\n\n${randomSuggestion}`;
        }
      }
      
      res.json({ 
        answer: reply,
        source: useDatasetAnswers ? 'dataset-enhanced' : 'general-knowledge'
      });
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      if (topMatches.length > 0) {
        const bestMatch = topMatches[0];
        res.json({ 
          answer: bestMatch.answer,
          note: "Technical issue encountered. Providing best available information.",
          source: 'fallback'
        });
      } else {
        res.status(500).json({ error: 'Unable to process this technical question at the moment.' });
      }
    }

    // After existing keyword checks, add new technology-specific handlers
    // Handle React.js questions
    const reactKeywords = ['react', 'reactjs', 'react.js', 'jsx', 'react component', 'hooks', 'useState', 'useEffect', 'context api', 'redux'];
    if (reactKeywords.some(keyword => questionLower.includes(keyword))) {
      // Continue with Gemini, but use a specialized context
      const reactContext = {
        category: "Modern Frontend",
        specialized: true,
        domain: "React.js"
      };
      // We'll pass this context to the AI model below
      return await generateSpecializedResponse(question, reactContext, res);
    }
    
    // Handle Node.js questions
    const nodeKeywords = ['node', 'nodejs', 'node.js', 'express', 'expressjs', 'npm', 'package.json', 'server-side javascript'];
    if (nodeKeywords.some(keyword => questionLower.includes(keyword))) {
      const nodeContext = {
        category: "Backend Development",
        specialized: true,
        domain: "Node.js"
      };
      return await generateSpecializedResponse(question, nodeContext, res);
    }
    
    // Handle Next.js questions
    const nextKeywords = ['next', 'nextjs', 'next.js', 'ssr', 'static generation', 'server components', 'app router', 'page router'];
    if (nextKeywords.some(keyword => questionLower.includes(keyword))) {
      const nextContext = {
        category: "Full Stack Framework",
        specialized: true,
        domain: "Next.js"
      };
      return await generateSpecializedResponse(question, nextContext, res);
    }
    
    // Handle deployment questions
    const deploymentKeywords = ['deploy', 'deployment', 'ci/cd', 'pipeline', 'hosting', 'aws', 'azure', 'gcp', 'vercel', 'netlify', 'heroku', 'docker', 'kubernetes'];
    if (deploymentKeywords.some(keyword => questionLower.includes(keyword))) {
      const deploymentContext = {
        category: "DevOps",
        specialized: true,
        domain: "Deployment"
      };
      return await generateSpecializedResponse(question, deploymentContext, res);
    }

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this new function for specialized tech responses
async function generateSpecializedResponse(question, context, res) {
  try {
    const prompt = `
You are a specialized interview preparation assistant for MockPrep, an AI-driven interview platform that helps users prepare for technical interviews.

User's question: "${question}"

Context: The question is about ${context.domain}, which falls under ${context.category}.

About ${context.domain}:
${getDomainSpecificContext(context.domain)}

Strict instructions (you must follow these exactly):
1. Provide a thorough, technically accurate response about ${context.domain}
2. Include code examples where appropriate (using markdown code blocks)
3. Mention common interview questions about ${context.domain} and how to answer them
4. Explain key concepts, best practices, and common pitfalls
5. Use a professional, factual tone - no jokes, emotions, or personal opinions
6. Do not mention yourself or refer to being an AI/model/assistant
7. Never apologize or use phrases like "I'm an AI" or "As an assistant"
8. Focus exclusively on factual technical information

When appropriate, encourage users to explore MockPrep's features like AI resource recommendations and free mock tests that focus on ${context.domain}.

Provide a clear, accurate, and helpful response with enough depth to demonstrate expertise in ${context.domain} during an interview.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1200, // Increased for more detailed technical explanations
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });
    
    let reply = result.response.text();
    
    // Post-processing (remove self-references, etc.)
    const selfReferences = [
      "As an AI", "as an AI", "I'm an AI", "I am an AI", 
      "As a language model", "as a language model",
      "I'm a", "I am a", "I'm not", "I am not",
      "I don't have", "I do not have", "I cannot", "I can't",
      "my knowledge", "my training", "my capabilities",
      "I'd recommend", "I would recommend", "I suggest",
      "In my view", "In my opinion", "I believe", "I think"
    ];
    
    for (const ref of selfReferences) {
      if (reply.includes(ref)) {
        reply = reply.replace(new RegExp(ref, "gi"), "Professional advice is to");
      }
    }
    
    // Add MockPrep promotion if not already included
    if (!reply.toLowerCase().includes("mockprep")) {
      reply = `${reply}\n\nFor more practice with ${context.domain} interview questions, check out MockPrep's personalized mock interviews and technical assessments tailored to your experience level.`;
    }
    
    res.json({ 
      answer: reply,
      source: 'specialized-knowledge'
    });
  } catch (error) {
    console.error('Error generating specialized response:', error);
    res.status(500).json({ error: 'Unable to process this technical question at the moment.' });
  }
}

// Helper function to provide domain-specific context for different technologies
function getDomainSpecificContext(domain) {
  switch (domain) {
    case "React.js":
      return `
- A JavaScript library for building user interfaces
- Key concepts: Components, Props, State, Hooks, Virtual DOM, JSX
- Common interview topics:
  * Component lifecycle methods
  * React hooks (useState, useEffect, useContext, useRef, etc.)
  * State management (Context API, Redux, Zustand)
  * Performance optimization techniques
  * React Router
  * Testing React components
  * Common React patterns and anti-patterns`;
      
    case "Node.js":
      return `
- A JavaScript runtime built on Chrome's V8 JavaScript engine
- Key concepts: Event loop, Non-blocking I/O, Modules, npm ecosystem
- Common interview topics:
  * Asynchronous programming in Node.js
  * Express.js middleware
  * RESTful API design
  * Authentication and authorization
  * Error handling
  * Database integration
  * Performance optimization and scaling
  * Logging and debugging`;
      
    case "Next.js":
      return `
- A React framework for production applications
- Key concepts: Server-side rendering, Static site generation, API routes, File-based routing
- Common interview topics:
  * App Router vs Pages Router
  * Data fetching strategies
  * Server Components vs Client Components
  * Image and Font optimization
  * Deployment and hosting
  * Authentication patterns
  * SEO optimization
  * Full-stack capabilities`;
      
    case "Deployment":
      return `
- Process of making software available for use
- Key concepts: CI/CD, Infrastructure as Code, Containerization, Cloud Services
- Common interview topics:
  * Deployment strategies (Blue/Green, Canary, Rolling)
  * Container orchestration with Docker and Kubernetes
  * Cloud platforms (AWS, Azure, GCP)
  * Serverless architecture
  * Infrastructure as Code (Terraform, CloudFormation)
  * Monitoring and logging
  * Security best practices
  * Rollback strategies`;
      
    default:
      return `
- Important technology in modern software development
- Relevant for technical interviews in software engineering roles
- Focus on best practices, common patterns, and practical applications`;
  }
}

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MockPrep Interview Assistant</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          .example { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>MockPrep Interview Assistant API</h1>
        <div class="container">
          <h2>How to use:</h2>
          <p>Send POST requests to <code>/ask</code> with a JSON body containing a question parameter.</p>
          
          <div class="example">
            <h3>Example request:</h3>
            <pre>
POST /ask HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "question": "What is a closure in JavaScript?"
}
            </pre>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("🚀 MockPrep Server running on http://localhost:3000");
});
