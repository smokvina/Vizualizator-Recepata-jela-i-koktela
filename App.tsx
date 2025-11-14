
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { Message, Role } from './types';
import { SYSTEM_INSTRUCTION } from './constants';

// --- Helper Components & Icons ---

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75v3.546l.065-.065a3.375 3.375 0 014.773 0l.065.065V5.25A.75.75 0 0115 4.5h.75a.75.75 0 01.75.75v3.546l.065-.065a3.375 3.375 0 014.773 0l.065.065V5.25a.75.75 0 01.75-.75H22.5a.75.75 0 01.75.75v14.5a.75.75 0 01-.75.75h-3.75a.75.75 0 01-.75-.75v-3.546l-.065.065a3.375 3.375 0 01-4.773 0l-.065-.065V18.75a.75.75 0 01-.75.75h-.75a.75.75 0 01-.75-.75v-3.546l-.065.065a3.375 3.375 0 01-4.773 0l-.065-.065V18.75a.75.75 0 01-.75.75H1.5a.75.75 0 01-.75-.75V5.25a.75.75 0 01.75-.75h3.75zM14.25 12a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" clipRule="evenodd" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);


interface ChatMessageProps {
    message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isModel = message.role === Role.MODEL;
    const canShare = typeof navigator.share === 'function' && !!message.imageUrl;

    const handleShare = async () => {
        if (!message.imageUrl) return;

        try {
            const response = await fetch(message.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'vizualizacija-recepta.jpg', { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Vizualizacija Recepta',
                    text: 'Pogledaj ovaj recept koji sam vizualizirao pomoću AI!',
                    files: [file],
                });
            } else {
                console.log("Sharing files is not supported on this browser.");
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Share action was canceled by the user.');
            } else {
                console.error('Error sharing:', error);
            }
        }
    };
    
    const handleDownload = () => {
        if (!message.imageUrl) return;
        const link = document.createElement('a');
        link.href = message.imageUrl;
        link.download = 'vizualizacija-recepta.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={`flex items-start gap-3 my-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
            {isModel && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center"><SparkleIcon className="w-5 h-5" /></div>}
            <div className={`max-w-xl p-4 rounded-2xl ${isModel ? 'bg-white text-slate-800 shadow-sm' : 'bg-blue-600 text-white'}`}>
                {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                {message.imageUrl && (
                    <div className="relative mt-2 -m-1 group">
                        <img src={message.imageUrl} alt="Generated recipe visualization" className="rounded-lg shadow-md w-full h-auto" />
                        <div className="absolute top-2 right-2 flex gap-2">
                             <button
                                onClick={handleDownload}
                                className="p-2 bg-black bg-opacity-40 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-opacity-60 transition-all duration-300"
                                aria-label="Preuzmi sliku"
                                title="Preuzmi sliku"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                            {canShare && (
                                <button
                                    onClick={handleShare}
                                    className="p-2 bg-black bg-opacity-40 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-opacity-60 transition-all duration-300"
                                    aria-label="Podijeli sliku"
                                    title="Podijeli sliku"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const aiRef = useRef<GoogleGenAI | null>(null);
    const chatRef = useRef<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        { role: Role.MODEL, content: 'Zdravo! Ja sam tvoj osobni vizualizator recepata. Upiši mi recept za jelo ili koktel koji želiš vidjeti, a ja ću ga oživjeti slikom! Ako mi nešto nedostaje, pitat ću te.' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            try {
                if (!process.env.API_KEY) {
                    console.error("API key not found. Please set the API_KEY environment variable.");
                    setMessages(prev => [...prev, { role: Role.MODEL, content: "Greška: API ključ nije postavljen. Molim konfigurirajte aplikaciju." }]);
                    return;
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                aiRef.current = ai;

                const chatSession = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction: SYSTEM_INSTRUCTION },
                });
                chatRef.current = chatSession;
                setIsInitialized(true);
            } catch (error) {
                console.error("Error initializing Gemini:", error);
                const errorMessage = `Došlo je do greške prilikom inicijalizacije AI modela: ${error instanceof Error ? error.message : String(error)}`;
                setMessages(prev => [...prev, { role: Role.MODEL, content: errorMessage }]);
            }
        };
        init();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const generateImage = useCallback(async (prompt: string) => {
        if (!aiRef.current) return;
        
        const generatingMessage: Message = { role: Role.MODEL, content: 'Odlično! Imam sve detalje. Generiram sliku za tebe... 🎨' };
        setMessages(prev => [...prev.slice(0, -1), generatingMessage]); 

        try {
            const response = await aiRef.current.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' }
            });

            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            
            const imageMessage: Message = { role: Role.MODEL, content: 'Evo vizualizacije tvog recepta!', imageUrl };
            setMessages(prev => [...prev, imageMessage]);
        } catch (error) {
            console.error("Error generating image:", error);
            const errorMessage: Message = { role: Role.MODEL, content: `Došlo je do greške prilikom generiranja slike: ${error instanceof Error ? error.message : String(error)}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (!userInput.trim() || isLoading || !chatRef.current) return;

        const userMessage: Message = { role: Role.USER, content: userInput.trim() };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const result = await chatRef.current.sendMessage({ message: userMessage.content });
            const responseText = result.text;
            
            let parsedJson;
            try {
                const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    parsedJson = JSON.parse(jsonMatch[1]);
                } else if (responseText.trim().startsWith('{')) {
                    parsedJson = JSON.parse(responseText.trim());
                }
            } catch (e) {
                // Not JSON, continue
            }

            if (parsedJson?.action === 'generate_image' && parsedJson.prompt) {
                const placeholderMessage: Message = { role: Role.MODEL, content: '...' };
                setMessages(prev => [...prev, placeholderMessage]);
                await generateImage(parsedJson.prompt);
            } else {
                const modelMessage: Message = { role: Role.MODEL, content: responseText };
                setMessages(prev => [...prev, modelMessage]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = `Došlo je do greške prilikom komunikacije s AI modelom: ${error instanceof Error ? error.message : String(error)}`;
            setMessages(prev => [...prev, { role: Role.MODEL, content: errorMessage }]);
            setIsLoading(false);
        }
    }, [userInput, isLoading, generateImage]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };
    
    return (
        <div className="flex flex-col h-screen max-w-3xl mx-auto bg-slate-50 shadow-2xl">
            <header className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-slate-800 text-center flex items-center justify-center gap-2">
                    <SparkleIcon className="w-6 h-6 text-blue-600" />
                    Vizualizator Recepata
                </h1>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <ChatMessage key={index} message={msg} />
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3 my-4 justify-start">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center"><SparkleIcon className="w-5 h-5" /></div>
                             <div className="max-w-xl p-4 rounded-2xl bg-white text-slate-800 shadow-sm">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                             </div>
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </main>

            <footer className="p-4 bg-white border-t border-slate-200 sticky bottom-0">
                <div className={`flex items-center bg-slate-100 rounded-full p-2 transition-all duration-300 ${isInputFocused ? 'ring-2 ring-blue-500 shadow-md' : 'ring-1 ring-slate-200'}`}>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        placeholder="Upišite recept, npr. Recept za palačinke..."
                        className="flex-1 bg-transparent border-none focus:ring-0 outline-none px-4 text-slate-800 placeholder-slate-400"
                        disabled={isLoading || !isInitialized}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !userInput.trim() || !isInitialized}
                        className="p-2 rounded-full bg-blue-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                        aria-label="Send message"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default App;
