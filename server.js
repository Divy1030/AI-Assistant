require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// Enable CORS for all origins
app.use(cors());

app.use(express.json());
app.use(express.static('public'));

const qaData = JSON.parse(fs.readFileSync('./data/question.js', 'utf8'));

// Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define allowed topics to strictly enforce boundaries
const allowedTopics = [
  // Software Development Categories
  'software development', 'programming', 'coding', 'javascript', 'python', 'java', 'c++', 'rust', 'go',
  
  // Data Structures & Algorithms
  'data structures', 'algorithms', 'complexity', 'big o', 'time complexity', 'space complexity', 
  'array', 'linked list', 'stack', 'queue', 'hash table', 'tree', 'binary tree', 'graph',
  'sorting', 'searching', 'merge sort', 'quick sort', 'binary search', 'dfs', 'bfs',
  'dynamic programming', 'greedy algorithm', 'recursion', 'backtracking', 'two pointers',
  'sliding window', 'breadth first search', 'depth first search', 'heap', 'priority queue',
  
  // System Design
  'system design', 'architecture', 'microservices', 'monolith', 'databases', 'caching', 'load balancing',
  'scalability', 'availability', 'reliability', 'fault tolerance', 'consistency', 'cap theorem',
  'distributed systems', 'sharding', 'partitioning', 'replication', 'message queue', 'api gateway',
  'cdn', 'url shortener', 'rate limiting', 'consistent hashing', 'database indexing',
  
  // Interview Process
  'interview process', 'technical interviews', 'coding interviews', 'behavioral interviews',
  'hr interview', 'phone screen', 'onsite', 'whiteboarding', 'take home assignment',
  'resume', 'cover letter', 'portfolio', 'salary negotiation', 'offer', 'rejection',
  'follow up', 'thank you note', 'preparation', 'mock interview',
  
  // Behavioral Questions & Soft Skills
  'star method', 'conflict resolution', 'teamwork', 'leadership', 'strengths and weaknesses',
  'career growth', 'motivation', 'strengths', 'weaknesses', 'communication skills',
  'time management', 'problem solving', 'adaptability', 'initiative', 'stress management',
  
  // Career Development
  'career development', 'tech industry', 'software engineering', 'web development',
  'roadmap', 'learning path', 'certification', 'bootcamp', 'degree', 'self taught',
  'career change', 'promotion', 'job search', 'networking', 'mentorship',
  
  // Technical Areas
  'frontend', 'backend', 'fullstack', 'devops', 'cloud', 'networking',
  'agile', 'scrum', 'kanban', 'sdlc', 'testing', 'ci/cd', 'version control',
  'react', 'reactjs', 'react.js', 'nodejs', 'node.js', 'nextjs', 'next.js', 'typescript',
  'angular', 'vue', 'vuejs', 'vue.js', 'svelte', 'express', 'expressjs', 'express.js',
  'mongodb', 'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'api',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'serverless',
  'deployment', 'hosting', 'netlify', 'vercel', 'heroku', 'digital ocean', 'github pages',
  'webpack', 'babel', 'eslint', 'prettier', 'jest', 'testing library', 'cypress', 'selenium',
  'authentication', 'authorization', 'oauth', 'jwt', 'security', 'csrf', 'xss',
  'responsive design', 'mobile first', 'pwa', 'progressive web app', 'seo', 'accessibility',
  
  // Company-specific
  'google', 'amazon', 'facebook', 'apple', 'microsoft', 'netflix', 'uber', 'airbnb', 'tesla',
  'twitter', 'linkedin', 'salesforce', 'adobe', 'ibm', 'oracle', 'faang', 'maang'
];

// Categories for specialized response handling
const interviewCategories = {
  dsa: {
    keywords: ['dsa', 'data structure', 'algorithm', 'complexity', 'big o', 'time complexity', 'space complexity', 
      'array', 'linked list', 'stack', 'queue', 'hash table', 'tree', 'binary tree', 'graph',
      'sorting', 'searching', 'merge sort', 'quick sort', 'binary search', 'dfs', 'bfs',
      'dynamic programming', 'greedy', 'recursion', 'backtracking', 'two pointers',
      'sliding window'],
    domain: "Data Structures & Algorithms"
  },
  systemDesign: {
    keywords: ['system design', 'architecture', 'microservices', 'monolith', 'databases', 'caching', 'load balancing',
      'scalability', 'availability', 'reliability', 'fault tolerance', 'consistency', 'cap theorem',
      'distributed systems', 'sharding', 'partitioning', 'replication', 'message queue', 'api gateway',
      'cdn', 'url shortener', 'rate limiting', 'consistent hashing'],
    domain: "System Design"
  },
  behavioral: {
    keywords: ['behavioral', 'star method', 'conflict', 'teamwork', 'leadership', 'strengths and weaknesses',
      'career growth', 'motivation', 'strengths', 'weaknesses', 'about yourself', 'tell me about yourself',
      'why should we hire you', 'where do you see yourself'],
    domain: "Behavioral Interview"
  },
  companySpecific: {
    keywords: ['google interview', 'amazon interview', 'facebook interview', 'meta interview',
      'apple interview', 'microsoft interview', 'netflix interview', 'uber interview', 'tesla interview',
      'twitter interview', 'linkedin interview', 'salesforce interview', 'faang interview', 'maang interview'],
    domain: "Company-Specific Interview"
  },
  mockInterview: {
    keywords: ['mock interview', 'practice interview', 'quiz', 'ask me', 'test me', 'rate my answer'],
    domain: "Mock Interview Simulation"
  },
  careerStrategy: {
    keywords: ['roadmap', 'strategy', 'prepare', 'crack interview', 'study plan', 'guide', 'final year', 'fresher'],
    domain: "Career Strategy"
  }
};

// Update the constants for response length control
const MAX_GENERAL_RESPONSE_TOKENS = 800;  // Reduced from 1500
const MAX_SPECIALIZED_RESPONSE_TOKENS = 1000; // Reduced from 1800
const MAX_MOCK_INTERVIEW_TOKENS = 1000; // Reduced from 1800

// Add a platform description based on frontend files
const PLATFORM_DESCRIPTION = `
MockPrep is an AI-driven interview preparation platform designed to help you ace technical interviews. Key features include:

1. **Personalized Practice**: Technical interview preparation tailored to your experience level and target roles
2. **Topic Coverage**: Comprehensive resources for data structures, algorithms, system design, and behavioral questions
3. **Interactive Interface**: User-friendly dashboard to track your progress and identify areas for improvement
4. **AI-Powered Feedback**: Real-time analysis of your responses with actionable improvement suggestions
5. **Company-Specific Preparation**: Targeted practice for interviews at top tech companies
6. **Mock Interviews**: Realistic interview simulations with adaptive difficulty

Start improving your interview skills today with our AI assistant and advanced resources!
`;

// Modify the /ask route to better handle general questions about interview processes

app.post('/ask', async (req, res) => {
  try {
    if (!req.body || !req.body.question) {
      return res.status(400).json({ error: 'Missing required field: question' });
    }
    
    const { question } = req.body;
    const questionLower = question.toLowerCase().trim();
    
    // Enhanced platform information detection
    const platformKeywords = [
      'what is mockprep', 'about mockprep', 'tell me about this platform', 'this platform', 
      'what does this app do', 'what is this app', 'features of mockprep', 'how mockprep works',
      'mockprep features', 'what mockprep offers', 'about this app', 'about this application',
      'this website', 'this service', 'what is this service'
    ];
    
    if (platformKeywords.some(keyword => questionLower.includes(keyword))) {
      return res.json({
        answer: PLATFORM_DESCRIPTION,
        source: 'platform-info'
      });
    }
    
    // Handle greetings with more helpful guidance
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some(greeting => questionLower === greeting || questionLower.startsWith(greeting + ' '))) {
      return res.json({
        answer: "Hello! I'm your interview preparation coach here to help you excel in technical interviews. You can ask about:\n\n• Data structures & algorithms (e.g., \"Explain binary search\")\n• System design (e.g., \"How to design Twitter?\")\n• Behavioral questions (e.g., \"How to use the STAR method?\")\n• Company-specific preparation (e.g., \"Amazon interview process\")\n• Mock interviews (e.g., \"Give me a JavaScript coding challenge\")\n\nWhat specific area would you like to focus on today?",
        source: 'greeting'
      });
    }
    
    // Detect mock interview/quiz requests
    const mockInterviewKeywords = [
      'mock interview', 'practice interview', 'simulate interview', 'give me a mock', 
      'quiz me', 'test me', 'ask me questions', 'interview simulation', 'practice questions',
      'coding challenge', 'give me a problem', 'challenge me'
    ];
    
    if (mockInterviewKeywords.some(keyword => questionLower.includes(keyword))) {
      // Determine which type of mock interview to simulate
      let mockContext = { domain: "General Interview" };
      
      if (questionLower.includes('dsa') || questionLower.includes('algorithm') || 
          questionLower.includes('coding') || questionLower.includes('data structure')) {
        mockContext.domain = "Data Structures & Algorithms Interview";
      } else if (questionLower.includes('system design') || questionLower.includes('architecture')) {
        mockContext.domain = "System Design Interview";
      } else if (questionLower.includes('behavioral') || questionLower.includes('hr')) {
        mockContext.domain = "Behavioral Interview";
      } else if (questionLower.includes('javascript') || questionLower.includes('js')) {
        mockContext.domain = "JavaScript Technical Interview";
      } else if (questionLower.includes('python')) {
        mockContext.domain = "Python Technical Interview";
      } else if (questionLower.includes('react') || questionLower.includes('frontend')) {
        mockContext.domain = "Frontend Development Interview";
      } else if (questionLower.includes('backend') || questionLower.includes('api')) {
        mockContext.domain = "Backend Development Interview";
      }
      
      return await generateMockInterviewSimulation(question, mockContext, res);
    }
    
    // Enhanced handling for interview process questions
    const interviewProcessKeywords = [
      'interview process', 'hiring process', 'recruitment', 'interview rounds', 'interview stages',
      'technical round', 'hr round', 'what happens', 'how does', 'what is the process',
      'how many rounds', 'interview timeline', 'selection process', 'assessment process'
    ];
    
    if (interviewProcessKeywords.some(keyword => questionLower.includes(keyword))) {
      return res.json({
        answer: "A typical tech company interview process consists of multiple stages:\n\n1. **Initial Screening**: Resume review followed by a 30-45 minute recruiter call to assess basic qualifications, role fit, and salary expectations.\n\n2. **Technical Assessment**: Often includes 1-3 coding challenges on platforms like HackerRank or LeetCode, typically focusing on data structures, algorithms, and problem-solving skills. This round eliminates approximately 50-60% of candidates.\n\n3. **Technical Phone Interviews**: 1-2 rounds of 45-60 minute technical discussions with engineers, including live coding on shared document platforms. Questions focus on algorithms, system design fundamentals, and role-specific technologies.\n\n4. **Onsite/Virtual Loop**: 4-6 interviews (45-60 minutes each) including:\n   - Coding interviews (2-3 rounds covering DSA problems of medium-hard difficulty)\n   - System design (for mid-senior roles, focusing on scalability and architecture)\n   - Behavioral questions using the STAR method to assess cultural fit\n   - Role-specific technical questions related to the specific team's technology stack\n\n5. **Hiring Manager Interview**: In-depth discussion about your experience, career goals, and team fit. This round often determines level and compensation.\n\n6. **Final Decision**: A hiring committee reviews all feedback, typically using a scoring system against defined rubrics. The process typically takes 3-6 weeks from application to offer.\n\nPreparation tips:\n- Focus 60% on coding practice, 30% on system design (for experienced roles), and 10% on behavioral preparation\n- Research company-specific interviewing styles and values\n- Practice verbalizing your thought process while solving problems\n\nMockPrep offers specialized interview simulations that match this exact process, with AI-driven feedback on both technical accuracy and communication style.",
        source: 'interview-process'
      });
    }
    
    // Enhanced handling for company-specific interview questions
    const companyKeywords = ['amazon', 'google', 'microsoft', 'meta', 'apple', 'netflix', 'interview at', 'process at'];
    if (companyKeywords.some(keyword => questionLower.includes(keyword))) {
      let company = '';
      for (const keyword of companyKeywords) {
        if (questionLower.includes(keyword)) {
          company = keyword;
          break;
        }
      }
      
      return res.json({
        answer: `The interview process at ${company.charAt(0).toUpperCase() + company.slice(1)} is known for its rigor and structured approach:\n\n1. **Initial Screen**: A 30-45 minute recruiter call discussing your background, role fit, and basic technical questions. The recruiter also explains the company's interview philosophy.\n\n2. **Online Assessment**: A timed coding assessment with 1-3 algorithmic problems of medium difficulty, typically focusing on data structures like arrays, strings, and trees. You'll have 60-90 minutes to complete these challenges.\n\n3. **Technical Phone Screens**: 1-2 rounds of 45-60 minute technical interviews with engineers, covering:\n   - Algorithm implementation with time/space complexity analysis\n   - Debugging and optimization of existing code\n   - Problem-solving approach and communication skills\n\n4. **Virtual/Onsite Loop**: 4-5 interviews including:\n   - Coding interviews: 2 rounds focusing on algorithms and data structures\n   - System design: Architecting a scalable system like a notification service or e-commerce platform\n   - Behavioral questions: Using specific examples from your past that demonstrate ${company.charAt(0).toUpperCase() + company.slice(1)}'s core values\n   - Role-specific technical assessment: Depth in relevant technologies\n\n5. **Bar Raiser**: A specialized interviewer evaluates if you're better than 50% of current employees at your level. This interviewer has veto power in the hiring decision.\n\n${company.charAt(0).toUpperCase() + company.slice(1)} particularly values candidates who can demonstrate ownership, dive deep into technical problems, and have a customer-obsessed mindset. They use a rubric-based evaluation focusing on both technical skills and leadership qualities.\n\nThe entire process typically takes 3-6 weeks. For preparation, focus on medium-hard LeetCode problems, system design fundamentals, and structuring behavioral responses using the STAR method while highlighting leadership principles.\n\nMockPrep's ${company.charAt(0).toUpperCase() + company.slice(1)}-specific interview simulations replicate this exact format with customized questions based on recent interview reports.`,
        source: 'company-specific-interview'
      });
    }
    
    // Add role-based specialization for different tech roles
    const roleBased = {
      frontend: {
        keywords: ['frontend', 'front-end', 'frontend developer', 'react', 'angular', 'vue', 'javascript', 'css', 'html'],
        domain: "Frontend Development"
      },
      backend: {
        keywords: ['backend', 'back-end', 'backend developer', 'api', 'server', 'database', 'nodejs', 'java backend', 'python backend'],
        domain: "Backend Development" 
      },
      fullstack: {
        keywords: ['fullstack', 'full-stack', 'full stack', 'mern', 'mean', 'both frontend and backend'],
        domain: "Full Stack Development"
      },
      mobile: {
        keywords: ['android', 'ios', 'mobile', 'react native', 'flutter', 'swift', 'kotlin'],
        domain: "Mobile Development"
      },
      devops: {
        keywords: ['devops', 'ci/cd', 'docker', 'kubernetes', 'aws', 'cloud', 'deployment'],
        domain: "DevOps Engineering"
      }
    };
    
    // Check for role-based questions
    for (const [role, data] of Object.entries(roleBased)) {
      if (data.keywords.some(keyword => questionLower.includes(keyword))) {
        const roleContext = {
          category: "roleSpecific",
          domain: data.domain
        };
        return await generateSpecializedResponse(question, roleContext, res);
      }
    }
    
    // Add general tech questions handler with improved detection
    const generalTechKeywords = [
      'what is', 'explain', 'how does', 'describe', 'define', 'pros and cons', 
      'difference between', 'compare', 'tell me about', 'what are', 'when to use', 
      'advantages of', 'disadvantages of', 'best practices for'
    ];
    if (generalTechKeywords.some(keyword => questionLower.includes(keyword))) {
      // This is likely a general knowledge question, let's use Gemini directly
      return await generateGeneralKnowledgeResponse(question, res);
    }
    
    // Detect specialized interview categories
    for (const [category, data] of Object.entries(interviewCategories)) {
      if (data.keywords.some(keyword => questionLower.includes(keyword))) {
        const specializedContext = {
          category: category,
          domain: data.domain
        };
        return await generateSpecializedResponse(question, specializedContext, res);
      }
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
4. Include technical examples when appropriate, including code examples for programming questions
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
          maxOutputTokens: MAX_GENERAL_RESPONSE_TOKENS, // Reduced for shorter responses
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
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this new function to handle general knowledge questions
async function generateGeneralKnowledgeResponse(question, res) {
  try {
    // Add this section to the prompt to encourage brevity
    const prompt = `
You are an expert interview coach with 10+ years of experience preparing students for technical and behavioral interviews at top tech companies.

User's question: "${question}"

This appears to be a general knowledge question about technology, programming, or the interview process.

Approach this as a senior technical mentor would:
1. Provide a clear, accurate, and CONCISE response with expert-level insights
2. Be direct and to the point - prioritize the most important information
3. If this is about a technology, focus on the 2-3 most interview-relevant aspects
4. If this is about an interview process, focus on the most practical insider tips
5. Use a professional yet approachable tone
6. Do not mention yourself or refer to being an AI/model/assistant
7. Never apologize or use phrases like "I'm an AI" or "As an assistant"
8. Include 1-2 common interview questions on this topic if relevant
9. Keep your response under 250 words for better readability

Provide a concise, accurate, and helpful response that demonstrates expertise while respecting the user's time.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Slightly increased for more natural expert-like responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: MAX_GENERAL_RESPONSE_TOKENS,
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
      reply = `${reply}\n\nMockPrep offers specialized practice questions and mock interviews tailored to this topic, with AI-powered feedback to accelerate your interview preparation.`;
    }
    
    res.json({ 
      answer: reply,
      source: 'general-knowledge'
    });
  } catch (error) {
    console.error('Error generating general knowledge response:', error);
    res.status(500).json({ error: 'Unable to process this question at the moment.' });
  }
}

// Specialized response function for different interview categories
async function generateSpecializedResponse(question, context, res) {
  try {
    // Create context-specific prompt based on the category
    let categorySpecificContext = getCategoryContext(context.category);
    
    // Enhanced expert persona prompt based on the specific domain
    let expertPersona = '';
    
    switch(context.category) {
      case 'dsa':
        expertPersona = "You are a senior software engineer with 10+ years of experience who specializes in data structures and algorithms. You've conducted 500+ technical interviews for FAANG companies and trained hundreds of candidates to master algorithmic problem-solving.";
        break;
      case 'systemDesign':
        expertPersona = "You are a system design expert with 10+ years of experience who interviews candidates for top tech companies. You've architected large-scale systems handling millions of users and can explain complex distributed systems concepts in an accessible way.";
        break;
      case 'behavioral':
        expertPersona = "You are an experienced HR manager and career coach with 10+ years of experience preparing candidates for behavioral interviews at top tech companies. You're an expert in the STAR method and have deep knowledge of what hiring managers look for.";
        break;
      case 'companySpecific':
        expertPersona = "You are a tech recruiter at top companies with 10+ years of experience. You know the latest hiring trends and typical interview questions for major tech companies. You've helped hundreds of candidates successfully prepare for specific company interview processes.";
        break;
      case 'mockInterview':
        expertPersona = "You are a professional interview coach who has conducted 1000+ mock interviews and trained candidates who successfully landed jobs at top tech companies. You know exactly what makes a strong interview response and can provide targeted feedback.";
        break;
      case 'careerStrategy':
        expertPersona = "You are an experienced tech mentor with 10+ years of experience guiding professionals through successful career transitions. You've developed proven roadmaps and strategies for interview preparation that have helped hundreds land their dream jobs.";
        break;
      default:
        expertPersona = "You are an expert interview coach with 10+ years of experience preparing students for technical and behavioral interviews at top tech companies.";
    }
    
    const prompt = `
${expertPersona}

User's question: "${question}"

Context: The question is about ${context.domain}.

${categorySpecificContext}

Approach this response as a seasoned professional with deep expertise:
1. Provide a thorough, technically accurate response about ${context.domain}
2. Include code examples where appropriate (using markdown code blocks)
3. For technical topics, include practical examples that would be useful during interviews
4. For behavioral questions, structure answers using the STAR framework when applicable
5. Use a professional but engaging tone - be encouraging and supportive
6. Do not mention yourself or refer to being an AI/model/assistant
7. Never apologize or use phrases like "I'm an AI" or "As an assistant"
8. Focus exclusively on factual information that would help someone prepare for interviews
9. Include specific examples or strategies that would impress interviewers
10. For coding questions, explain the approach clearly before diving into code
11. Share insider tips that demonstrate your extensive interview experience
12. If appropriate, ask reflective questions to help the user think more deeply about the topic

Provide a clear, accurate, and helpful response with enough depth to demonstrate expertise in ${context.domain} during an interview.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Slightly higher for more natural expert-like responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: MAX_SPECIALIZED_RESPONSE_TOKENS, // Reduced for shorter responses
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
      let customPromotionText = '';
      
      switch(context.category) {
        case 'dsa':
          customPromotionText = `For targeted practice with ${context.domain} questions, MockPrep offers interactive coding challenges with detailed explanations and real-time performance analysis.`;
          break;
        case 'systemDesign':
          customPromotionText = `To further develop your ${context.domain} skills, MockPrep provides interactive system design scenarios with expert feedback on your approach and architecture decisions.`;
          break;
        case 'behavioral':
          customPromotionText = `Perfect your behavioral interview responses with MockPrep's STAR framework analyzer and personalized feedback on communication style and content.`;
          break;
        case 'companySpecific':
          customPromotionText = `MockPrep's company-specific interview simulations model the exact format and question style used by your target companies, giving you an authentic practice experience.`;
          break;
        case 'mockInterview':
          customPromotionText = `MockPrep's adaptive mock interview system adjusts difficulty based on your performance, providing a realistic interview experience with detailed feedback.`;
          break;
        case 'careerStrategy':
          customPromotionText = `MockPrep creates personalized interview preparation roadmaps tailored to your timeline, background, and target roles.`;
          break;
        default:
          customPromotionText = `For comprehensive interview preparation on this topic, try MockPrep's personalized mock interviews and adaptive practice questions.`;
      }
      
      reply = `${reply}\n\n${customPromotionText}`;
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

// Helper function to provide context for different interview categories
function getCategoryContext(category) {
  switch (category) {
    case "dsa":
      return `
This is a Data Structures & Algorithms question. When answering:
- Focus on the problem-solving approach first, implementation second
- Always analyze time and space complexity using Big O notation
- Provide optimized solutions that would impress interviewers
- Include clean, commented code examples in Python or JavaScript
- Break down solutions step-by-step with detailed explanations
- Address edge cases and optimizations explicitly
- Mention pattern recognition techniques for similar problems
- Include visualization aids when explaining complex algorithms
- Offer follow-up questions an interviewer might ask next

Common DSA interview topics to reference:
- Arrays, linked lists, trees, graphs, hash tables
- Sorting, searching, recursion, dynamic programming
- Two pointers, sliding window, DFS/BFS
- Time/space complexity trade-offs
- Problem-solving strategies (brute force → optimization)`;
      
    case "systemDesign":
      return `
This is a System Design question. When answering:
- Follow a structured framework: requirements, scale, design, bottlenecks
- Start by clarifying functional and non-functional requirements
- Use a top-down approach: high-level design first, then drill down
- Discuss multiple viable solutions and their trade-offs
- Explain how to handle scale (10x, 100x, 1000x users)
- Address failure scenarios and how to mitigate them
- Focus on real-world considerations that senior engineers value
- Outline both data models and API endpoints when relevant
- Provide implementation insights but prioritize architecture

Key system design topics to reference:
- Load balancing strategies and anti-patterns
- Database selection criteria and scaling techniques  
- Caching implementations and invalidation strategies
- Microservices vs monoliths with concrete examples
- CAP theorem with practical applications
- Consistency patterns in distributed systems
- Real-time processing vs batch processing approaches`;
      
    case "behavioral":
      return `
This is a Behavioral Interview question. When answering:
- Structure responses using the STAR method (Situation, Task, Action, Result)
- Emphasize specific, quantifiable achievements and outcomes
- Show self-awareness and growth mindset through the examples
- Be concise but detailed; responses should be 2-3 minutes max
- Focus on your direct contributions while acknowledging teamwork
- Include challenges faced and how they were overcome
- Present a balanced picture of both technical and soft skills
- Demonstrate values that align with top companies' cultures
- Show leadership, ownership, and initiative in your examples

Key behavioral topics to reference:
- Leadership and impact stories with measurable results
- Conflict resolution with positive relationship outcomes
- Decision-making under uncertainty or with limited data
- Handling criticism and failure with growth orientation
- Project management and prioritization strategies
- Cross-functional collaboration experiences
- Innovation and problem-solving beyond job requirements`;
      
    case "companySpecific":
      return `
This is about a Company-Specific Interview process. When answering:
- Detail the unique interview formats and evaluation criteria of the company
- Highlight company values and how they manifest in interview questions
- Provide insights into role-specific assessment areas
- Outline the full interview loop and what to expect at each stage
- Suggest preparation strategies based on company focus areas
- Include common question themes and assessment frameworks
- Discuss both technical and cultural fit evaluation methods
- Mention typical timeframes and decision processes
- Provide guidance on company-specific coding standards or design philosophies

Company interview patterns to reference:
- Assessment focus areas by company (Amazon: leadership principles, Google: algorithm optimization)
- Company-specific frameworks (e.g., Amazon's STAR+LP)
- Culture-fit questions tailored to company values
- Role expectations and growth trajectories
- Level-appropriate technical complexity expectations
- Decision-making processes and offer timelines
- Company-specific preparation resources`;
      
    case "mockInterview":
      return `
This is a Mock Interview or Assessment request. When answering:
- Structure the response as a realistic interview simulation
- Ask questions of appropriate difficulty for the user's apparent level
- Include a diverse mix of question types (technical, problem-solving, behavioral)
- For technical questions, include clear assessment criteria and expectations
- For behavioral questions, note what specific competencies are being evaluated
- Provide constructive, specific feedback after each answer
- Focus on both content and delivery aspects in feedback
- Suggest concrete improvement areas and specific practice strategies
- Simulate follow-up questions an interviewer would naturally ask

Approach for mock interviews:
- Start with clear expectations and interview simulation structure
- Present questions exactly as a real interviewer would phrase them
- For multi-part responses, prompt for missing elements a real interviewer would expect
- Evaluate answers against industry standards for the role and level
- Provide balanced feedback: strengths, areas for improvement, and actionable next steps
- Offer communication style guidance in addition to content feedback`;
      
    case "careerStrategy":
      return `
This is a Career Strategy question. When answering:
- Provide a customized roadmap with concrete milestones and timelines
- Suggest role-appropriate resources and practice materials
- Include both technical and soft skills development strategies
- Create balanced preparation plans that are realistic and effective
- Suggest practice routines based on proven learning methodologies
- Incorporate spaced repetition and active recall techniques
- Address both short-term interview preparation and long-term career growth
- Include strategies for building a personal brand and portfolio
- Leverage industry insider knowledge about what truly matters in interviews

Key career preparation elements to include:
- Structured preparation timelines with specific milestones
- Priority-ranked topic lists based on interview frequency and impact
- Resource recommendations for different learning styles
- Technical preparation balanced with behavioral practice
- Mock interview and feedback incorporation strategies
- Networking and referral optimization techniques
- Portfolio development guidelines for role-specific impact
- Company targeting strategies based on personal fit
- Work-life balance maintenance during intense preparation`;
      
    default:
      return `
This is a technical interview preparation question. When answering:
- Provide expert-level insights with practical application examples
- Include both fundamental concepts and advanced nuances
- Structure your response for clarity and easy comprehension
- Focus on aspects most likely to be evaluated in interviews
- Include common misconceptions and how to avoid them
- Relate concepts to real-world engineering scenarios
- Highlight key differentiators between junior and senior answers
- Provide concrete examples that demonstrate mastery
- Suggest follow-up topics the user should explore next`;
  }
}

// Add a new method to handle mock interview simulations
async function generateMockInterviewSimulation(question, context, res) {
  try {
    const prompt = `
You are an experienced technical interviewer who has conducted thousands of interviews at top tech companies. You're simulating a real interview experience.

User has requested: "${question}"

Create a realistic interview simulation related to ${context.domain}. 

Your approach should be:
1. Start with a brief introduction as the interviewer would
2. Ask 3-5 increasingly challenging questions one by one
3. For each question, provide:
   - Clear problem statement
   - Expected format for the answer
   - Hints if applicable (as a real interviewer might provide)
4. After presenting all questions, explain:
   - How this accurately simulates a real interview
   - What the interviewer is looking for in each question
   - Common pitfalls candidates make
   - How to stand out with exceptional answers
5. Use a professional but conversational tone an interviewer would use
6. Do not mention yourself or refer to being an AI/model/assistant

Make this simulation experience as authentic as possible, focusing on questions that would realistically be asked in a ${context.domain} interview.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: MAX_MOCK_INTERVIEW_TOKENS, // Reduced for shorter responses
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
    
    // Post-processing
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
        reply = reply.replace(new RegExp(ref, "gi"), "Professional interviewers typically");
      }
    }
    
    // Add MockPrep promotion
    if (!reply.toLowerCase().includes("mockprep")) {
      reply = `${reply}\n\nFor more comprehensive mock interview practice, MockPrep offers interactive simulations with real-time feedback and performance analysis to help you master these types of questions.`;
    }
    
    res.json({ 
      answer: reply,
      source: 'mock-interview-simulation'
    });
  } catch (error) {
    console.error('Error generating mock interview:', error);
    res.status(500).json({ error: 'Unable to generate mock interview simulation at the moment.' });
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
          .category { margin-top: 20px; border-left: 4px solid #007bff; padding-left: 15px; }
          .suggestion { color: #555; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>MockPrep Interview Assistant</h1>
        <div class="container">
          <h2>How to use:</h2>
          <p>Send POST requests to <code>/ask</code> with a JSON body containing a question parameter.</p>
          
          <div class="category">
            <h3>🧩 Data Structures & Algorithms</h3>
            <p class="suggestion">Example: "How do I solve a two-pointer problem?" or "What's the time complexity of merge sort?"</p>
          </div>
          
          <div class="category">
            <h3>🏗️ System Design</h3>
            <p class="suggestion">Example: "Design a URL shortener" or "Explain microservices architecture"</p>
          </div>
          
          <div class="category">
            <h3>🗣️ Behavioral Questions</h3>
            <p class="suggestion">Example: "How to answer 'Tell me about yourself'?" or "STAR method example"</p>
          </div>
          
          <div class="category">
            <h3>🏢 Company-Specific Preparation</h3>
            <p class="suggestion">Example: "What does Google ask in interviews?" or "Amazon behavioral questions"</p>
          </div>
          
          <div class="category">
            <h3>🔄 Mock Interview</h3>
            <p class="suggestion">Example: "Give me 5 JavaScript interview questions" or "Test me on system design"</p>
          </div>
          
          <div class="example">
            <h3>API Request Example:</h3>
            <pre>
POST /ask HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "question": "How do I implement a binary search tree in JavaScript?"
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