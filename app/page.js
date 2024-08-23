'use client'
import { Button, Stack, TextField } from "@mui/material";
import { Box } from "@mui/system";
import { useState } from "react";
import "./globals.css";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm the Rate my Professor support assistant. How can I help you today?"

    }
  ])
  const [message, setMessage] = useState('')

  const sendMessage = async ()=>{
    setMessages((messages) => [
      ...messages,
      {role: 'user', content: message},
      {role: 'assistant', content: ''}
    ])
    setMessage('')

    const response = fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, {role: 'user', content: message}])
    }).then(async(res) =>{
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let result = ''
      return reader.read().then(function processText({done, value}){
        if (done){
          return result
        }
        const text = decoder.decode(value || new Uint8Array(), {stream: true})
        setMessages((messages)=>{
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return [
            ...otherMessages,
            {...lastMessage, content: lastMessage.content + text}
          ]
        })

        return reader.read().then(processText)
      })
    })
  }

  return (
    <div className="chat-container">
      <div className="chat-header">Rate My Professor AI Assistant</div>
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role === 'assistant' ? 'assistant-message' : 'user-message'}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="input-container">
        <TextField
          className="message-input"
          label='Message'
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button className="send-button" variant="contained" onClick={sendMessage}>
          Send
        </Button>
      </div>
    </div>
  );
}
