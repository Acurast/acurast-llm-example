import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Loader2, Send, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "bot";
  text: string;
}

const DEFAULT_LLM_URL = "http://localhost:1234/v1/chat/completions";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [llmUrl, setLlmUrl] = useState(DEFAULT_LLM_URL);
  const [tempLlmUrl, setTempLlmUrl] = useState(DEFAULT_LLM_URL);

  useEffect(() => {
    const savedUrl = localStorage.getItem("llmUrl");
    if (savedUrl) {
      setLlmUrl(savedUrl);
      setTempLlmUrl(savedUrl);
    }
  }, []);

  const handleSaveSettings = () => {
    setLlmUrl(tempLlmUrl);
    localStorage.setItem("llmUrl", tempLlmUrl);
    setShowSettings(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch(llmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: input,
            },
          ],
          model: "llama-3.1-8b-lexi-uncensored-v2",
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("LM Studio error:", errorText);
        throw new Error(
          `Failed to get response from LM Studio (${response.status}): ${errorText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to create reader");
      }

      let accumulatedMessage = "";
      setMessages((prev) => [...prev, { sender: "bot", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonString = line.slice(6);
            if (jsonString === "[DONE]") continue;

            try {
              const jsonData = JSON.parse(jsonString);
              const content = jsonData.choices[0]?.delta?.content;
              if (content) {
                accumulatedMessage += content;
                setMessages((prev) => {
                  const updatedMessages = [...prev];
                  updatedMessages[updatedMessages.length - 1] = {
                    sender: "bot",
                    text: accumulatedMessage,
                  };
                  return updatedMessages;
                });
              }
            } catch (e) {
              console.error("Failed to parse JSON:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      receiveMessage(
        "Sorry, I encountered an error while processing your request."
      );
    } finally {
      setIsTyping(false);
    }
  };

  const receiveMessage = async (text: string) => {
    setIsTyping(true);
    const words = text.split(" ");
    let message = "";
    setMessages((prev) => [...prev, { sender: "bot", text: "" }]);

    for (const word of words) {
      message += (message ? " " : "") + word;
      await new Promise((resolve) => setTimeout(resolve, 100));
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1] = {
          sender: "bot",
          text: message,
        };
        return updatedMessages;
      });
    }

    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      <div className="border-b border-[#E5E5E5] p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-[#303030] border-b-2 border-[#c0e700] inline-block pb-1">
          Acurast LLM Example
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Settings size={20} className="text-[#303030]" />
        </button>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LLM API URL
                </label>
                <Input
                  value={tempLlmUrl}
                  onChange={(e) => setTempLlmUrl(e.target.value)}
                  placeholder="Enter LLM API URL"
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-[#c0e700] hover:bg-[#aad100] rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-2.5 max-w-[80%] text-[15px] leading-[1.4] ${
                  msg.sender === "user"
                    ? "bg-[#c0e700] text-[#303030] rounded-[18px] rounded-br-[4px]"
                    : "bg-[#F2F2F2] text-[#303030] rounded-[18px] rounded-bl-[4px]"
                }`}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="my-0">{children}</p>,
                    pre: ({ children }) => (
                      <pre className="bg-[#2a2a2a] text-white p-2 rounded-md overflow-x-auto">
                        {children}
                      </pre>
                    ),
                    code: ({ children }) => (
                      <code className="bg-[#2a2a2a] text-white px-1 py-0.5 rounded">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[#F2F2F2] rounded-[18px] rounded-bl-[4px] p-4">
                <Loader2 className="animate-spin text-[#303030]" size={16} />
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-[#E5E5E5]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e: React.KeyboardEvent) =>
              e.key === "Enter" && handleSend()
            }
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-[#c0e700] rounded-lg hover:bg-[#aad100] transition-colors"
          >
            <Send size={20} className="text-[#303030]" />
          </button>
        </div>
      </div>
    </div>
  );
}
