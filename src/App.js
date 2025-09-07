// src/App.js
import React, { useState, useEffect, useRef } from "react";
import useSpeech from "./hooks/useSpeech";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Track voice playback state
  const aiVoice = "openai"; // Constant since it's not updated

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
  const { listening, transcript, start, stop: speechStop, speak, isSupported, cancel } = useSpeech();
  const submitted = useRef(false);

  const clearFile = () => {
    setFile(null);
    setPreview("");
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview("");
  };

  const sendToBackend = async (text) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("question", text);
      if (file) form.append("file", file);
      const res = await fetch(`${BACKEND_URL}/ask`, { method: "POST", body: form });
      const data = await res.json();

      setResults(data); // Set results directly
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      submitted.current = false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() && !file) return;
    submitted.current = true;
    sendToBackend(question);
    setQuestion("");
    clearFile();
    submitted.current = false;
  };

  const playVoice = () => {
    if (results && !isPlaying) {
      const available = Object.keys(results.results);
      const voice = available.includes(aiVoice) ? aiVoice : available[0];
      speak(results.results[voice]); // Use voice variable
      setIsPlaying(true);
    }
  };

  const stopVoice = () => {
    if (isPlaying) {
      try {
        if (cancel && typeof cancel === "function") {
          cancel(); // Attempt to stop via useSpeech hook
        } else if (typeof window.speechSynthesis !== "undefined") {
          window.speechSynthesis.cancel(); // Fallback to native API
        }
        setIsPlaying(false);
      } catch (err) {
        console.error("Error stopping speech:", err);
        setIsPlaying(false); // Ensure state is updated
      }
    }
  };

  const aiBlocks = [
    { key: "openai", label: "OpenAI", color: "openai" },
    { key: "mistral", label: "Mistral", color: "mistral" },
    
    { key: "gemini", label: "Gemini", color: "gemini" },
  ];

  const renderBullets = (text, sources = []) =>
    text
      .split("- ")
      .filter((l) => l.trim())
      .map((line, i) => {
        const cit = sources[i] ? ` <a href="${sources[i].url}" target="_blank" rel="noopener noreferrer">[${sources[i].title} (${sources[i].date})]</a>` : '';
        return <li key={i} dangerouslySetInnerHTML={{ __html: line.trim() + cit }} />;
      });

  useEffect(() => {
    if (!listening && transcript.trim()) {
      sendToBackend(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, transcript]);

  return (
    <div className="wrap">
      {/* LEFT – AI cards */}
      <aside className="left-panel">
        <h2 className="panel-title">AI Responses</h2>
        {!results ? (
          <p className="empty">No responses yet. Just start talking…</p>
        ) : (
          <div className="ai-grid">
            {aiBlocks.map(({ key, label, color }) => (
              <div className={`ai-block ${color}`} key={key}>
                <h3 className="block-title">{label}</h3>
                <ul className="bullet-list">{renderBullets(results.results[key], results.sources || [])}</ul>
              </div>
            ))}
            {results && (
              <div className="voice-controls">
                <button onClick={playVoice} disabled={isPlaying || !results} className="voice-btn">
                  {isPlaying ? "Playing…" : "Play Response"}
                </button>
                <button onClick={stopVoice} disabled={!isPlaying} className="voice-btn stop-btn">
                  Stop
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* RIGHT – Conclusion + Chat (Fixed position) */}
      <main className="right-panel">
        <div className="conclusion-area">
          <h2 className="panel-title">Conclusion</h2>
          {results ? (
            <ul className="bullet-list" dangerouslySetInnerHTML={{ __html: results.conclusion.replace(/\n/g, '<br/>').replace(/- /g, '<li>').replace(/\[([^\]]+)\]\(([^)]+)\) \(([^)]+)\)/g, ' <a href="$2" target="_blank">$1 ($3)</a>') }} />
          ) : (
            <p className="empty">Conclusion will appear here…</p>
          )}
          {results?.sources?.length > 0 && (
            <div className="sources-list">
              <h3 className="sub-title">Sources</h3>
              <ul>
                {results.sources.map((src, i) => (
                  <li key={i}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">{src.title}</a> ({src.date})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="chat-area">
          <h3 className="panel-title">Chatbot</h3>
          {isSupported && (
            <p className="voice-hint">
              {listening ? "🎤 Listening… speak now!" : "Tap 🎤 once, then just talk."}
            </p>
          )}
          <form onSubmit={handleSubmit} className="chat-form">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type here…"
              rows={3}
              className="input-textarea"
            />
            <div className="chat-controls">
              {isSupported && (
                <>
                  <button type="button" onClick={start} disabled={loading} className="control-btn">
                    🎤
                  </button>
                  <button type="button" onClick={speechStop} disabled={loading} className="control-btn">
                    ⏹
                  </button>
                </>
              )}
              <label className="attach">
                <input type="file" accept="image/*,.pdf" onChange={handleFile} hidden />
                📎
              </label>
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Replying…" : "➤"}
              </button>
            </div>
          </form>
          {file && (
            <div className="file-thumb">
              {preview ? <img src={preview} alt="preview" className="file-preview" /> : <span className="pdf-icon">📄</span>}
              <small className="file-name">{file.name}</small>
              <button type="button" onClick={clearFile} className="remove-btn">✕</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;