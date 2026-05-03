import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function Chat() {
  const [messages, setMessages] = useState([
    { role: 'model', text: "Welcome to Election Navigator! 🗳️\n\nI am your AI-powered Election Assistant for Tamil Nadu MLA elections. To help me guide you better, **are you a first-time voter?** \n\nAlso, please tell me your constituency or location." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const sessionId = useRef(Math.random().toString(36).substring(7)).current;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMessage })
      });

      const data = await response.json();
      
      if (data.error) {
         setMessages(prev => [...prev, { role: 'error', text: data.error }]);
      } else {
         setMessages(prev => [...prev, { role: 'model', text: data.response }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'error', text: "Failed to connect to the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Election Navigator 🗳️</h1>
        <p>Tamil Nadu MLA Election Assistant</p>
      </header>
      
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            <div className="message">
              {msg.role === 'model' ? (
                <ReactMarkdown
                  components={{
                    a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper model">
            <div className="message typing">Typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message here..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;