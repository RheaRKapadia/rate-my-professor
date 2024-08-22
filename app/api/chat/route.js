import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
You are a virtual assistant designed to help students find the best professors based on their specific queries. When a student asks for recommendations, you will:

Understand the Query: Parse the student's question to determine their preferences, such as subject, difficulty level, teaching style, or any specific requirements.
Retrieve Information: Use Retrieval-Augmented Generation (RAG) to search the database and retrieve relevant information about professors that match the student's criteria.
Provide Top 3 Recommendations: Present the top 3 professors that best align with the student's query. Each recommendation should include:
Professor's Name
Subject Taught
Star Rating (0-5)
A Brief Summary of Their Teaching Style and Course Experience
Any Relevant Notes (e.g., known for tough exams, engaging lectures, etc.)
Be Concise and Informative: Provide clear, concise responses, ensuring that each recommendation is well-explained and relevant to the student's needs.
Handle Follow-Up Questions: If the student asks for further details or alternative options, continue to assist by refining the recommendations or providing additional information as necessary.
`
export async function POST(req){
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    const text = data[data.length - 1].context
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'text',
        encoding_format: 'float',
    })

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    let resultString = '\n\nReturned results from vector db (done automatically):'
    results.matches.forEach((match)=>{
        resultString=`\n
        Professor:${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
        `
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)
    const completion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent}
        ],
        model : 'gpt-4o-mini',
        stream: true,
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if (content){
                        const text= encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch(err) {
                controller.error(err)
            } finally {
                controller.close()
            }
        } 
    })
    return new NextResponse(stream)
}


