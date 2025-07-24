// RUTA: /cliente/src/pages/Asistente.tsx

import React, { useState, useRef, useEffect } from "react";
import { Bot, User as UserIcon, Send, CornerDownLeft } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import axiosInstance from "../api/axiosInstance";
import { cn } from "../lib/utils";

interface Message {
  sender: "user" | "bot";
  text: string;
}

const Asistente: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem("chatHistory");
    return savedMessages
      ? JSON.parse(savedMessages)
      : [
          {
            sender: "bot",
            text: "¡Hola! Soy tu asistente. Pregúntame lo que quieras sobre los datos de la aplicación.",
          },
        ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Guardar historial en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: "user", text: input };
    const currentInput = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axiosInstance.post("/assistant/chat", {
        history: messages, // Enviamos el historial para que la IA "recuerde"
        question: currentInput,
      });
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.data.answer },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Lo siento, hubo un error al conectar con el servidor de IA.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Asistente de IA</h1>
      <Card className="p-0">
        <div className="flex flex-col h-[75vh]">
          {/* Área de mensajes */}
          <div className="flex-1 space-y-6 p-6 overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn("flex items-start gap-4", {
                  "justify-end": msg.sender === "user",
                })}
              >
                {msg.sender === "bot" && (
                  <div className="flex-shrink-0 bg-blue-600 h-8 w-8 rounded-full flex items-center justify-center text-white">
                    <Bot size={18} />
                  </div>
                )}
                <div
                  className={cn("max-w-xl p-3 rounded-lg text-sm leading-6", {
                    "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200":
                      msg.sender === "bot",
                    "bg-blue-500 text-white": msg.sender === "user",
                  })}
                >
                  <p>{msg.text}</p>
                </div>
                {msg.sender === "user" && (
                  <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-600 h-8 w-8 rounded-full flex items-center justify-center">
                    <UserIcon size={18} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-blue-600 h-8 w-8 rounded-full flex items-center justify-center text-white animate-pulse">
                  <Bot size={18} />
                </div>
                <div className="max-w-md p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-0"></span>
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Área de entrada de texto */}
          <div className="border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <form onSubmit={handleSendMessage} className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Pregúntale al asistente... (Ej: ¿Quién tiene más puntos?)"
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400"
                rows={1}
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                disabled={isLoading || !input.trim()}
              >
                <Send size={16} />
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Asistente;
