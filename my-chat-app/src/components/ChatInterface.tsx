import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      receiveMessage("Let me think about that...");
    }, 1000);
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
      <div className="border-b border-[#E5E5E5] p-4">
        <h1 className="text-xl font-semibold text-[#303030]">Acurast LLM</h1>
      </div>
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
                {msg.text}
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
