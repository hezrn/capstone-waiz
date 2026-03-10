import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, X, MessageCircle, Trash2, ChevronDown, Copy, Check, Maximize2, Minimize2, ChevronRight, Lightbulb, HelpCircle } from "lucide-react";
import { User as UserType, ChatbotConversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatbotBubbleProps {
  currentUser: UserType | null;
  activeTab?: string;
}

const SUGGESTED_PROMPTS = [
  "How do I sell recyclables?",
  "What are the current rates?",
  "How to create a collection request?",
  "Tell me about eco-friendly practices",
  "Magkano ang plastic bottles?",
  "Paano magbenta ng recyclables?",
  "What materials are accepted?",
  "How much can I earn?",
];

const FAQ_ITEMS = [
  {
    question: "How do I get started on Waiz?",
    answer: "Sign up as either a Household or Junkshop, complete your profile, and you're ready to buy, sell, and trade recyclables with our community!"
  },
  {
    question: "Can I both buy and sell items?",
    answer: "Yes! Both Households and Junkshops can buy and sell items on Waiz. This makes it a flexible platform for everyone in the recycling community."
  },
  {
    question: "What is a collection request?",
    answer: "A collection request is when a Household asks a Junkshop to pick up recyclables from their location. Junkshops can accept these requests and arrange pickup. Perfect for bulk materials!"
  },
  {
    question: "How are market rates determined?",
    answer: "Rates are based on EMB Central Office MRF (Material Recovery Facility) prices in Philippine Pesos. Materials include plastic, paper, cardboard, metal, glass, and more. Junkshops can update rates to ensure market transparency."
  },
  {
    question: "Is messaging secure?",
    answer: "Yes, all direct messages between users are secure. You can discuss details, arrange pickups, and negotiate prices safely with other users."
  },
  {
    question: "What materials are accepted?",
    answer: "Waiz accepts most recyclables including plastic bottles (PET, HDPE), cardboard, paper, glass, metal, aluminum cans, and copper. Check the Rate List for current prices per material."
  },
  {
    question: "Paano mag-apply ang Households?",
    answer: "Simpleng mag-sign up lang! Piliin ang Household user type, kumpleto ang profile, at ready ka nang bumili at magbenta ng recyclables. Walang bayad na membership!"
  },
  {
    question: "Magkano ang kinikita sa recyclables?",
    answer: "Nakadepende sa materyal at dami. Plastic bottles ay ₱10-15/kg, cardboard ₱3-5/kg, at iba pa. Mas maraming materyales = mas malaking kinikita. Tingnan ang Rate List para sa exact prices!"
  },
];

const WAIZ_FEATURES = [
  { icon: "📦", title: "Smart Marketplace", desc: "Browse and sell recyclables with real-time pricing. Plastic, paper, cardboard, metal & more!" },
  { icon: "🚚", title: "Collection Requests", desc: "Request pickups for bulk materials. Junkshops compete to serve you with best prices." },
  { icon: "💬", title: "Direct Messaging", desc: "Chat securely with buyers and sellers. Negotiate prices and arrange pickups safely." },
  { icon: "💰", title: "Fair Pricing", desc: "Market rates based on EMB Central Office MRF prices. Transparent & competitive pricing." },
  { icon: "🤖", title: "Jarvish AI", desc: "Smart assistant in English & Tagalog. Ask about prices, materials, and how to use Waiz." },
  { icon: "⭐", title: "Ratings & Reviews", desc: "Build trust through verified transactions. Rate buyers and sellers after each trade." },
  { icon: "📊", title: "Rate List", desc: "Live pricing for plastic, cardboard, metal, paper, glass - updated by junkshops daily" },
  { icon: "🌱", title: "Eco-Impact", desc: "Help Baguio City reduce waste. Earn money while protecting the environment!" },
];

export function ChatbotBubble({ currentUser, activeTab }: ChatbotBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [viewTab, setViewTab] = useState<"chat" | "faq" | "about">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Close chatbot when tab changes
  useEffect(() => {
    setIsOpen(false);
  }, [activeTab]);

  const { data: conversations = [] } = useQuery<ChatbotConversation[]>({
    queryKey: ["/api/chatbot", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/chatbot/${currentUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch chat history");
      return response.json();
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chatbot/chat", {
        userId: currentUser?.id,
        message,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot", currentUser?.id] });
      setMessageText("");
    },
    onError: (error: any) => {
      console.error("Chat error:", error);
    },
  });

  // Command mutation for sending messages
  const commandMutation = useMutation({
    mutationFn: async (command: string) => {
      const response = await apiRequest("POST", "/api/chatbot/process-command", {
        userId: currentUser?.id,
        command,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot", currentUser?.id] });
      setMessageText("");
      // Refetch messages to show the sent message
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: any) => {
      console.error("Command error:", error);
    },
  });

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight;
      }, 0);
    }
  }, [conversations, chatMutation.isPending, commandMutation.isPending]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    // Detect message command patterns
    const msgLower = messageText.toLowerCase();
    const isMessageCommand = 
      /send\s+(message|msg)/.test(msgLower) || 
      /message\s+/.test(msgLower) ||
      /tell\s+/.test(msgLower) ||
      /contact\s+/.test(msgLower) ||
      /reach\s+out/.test(msgLower);

    if (isMessageCommand) {
      // Process as a command
      commandMutation.mutate(messageText);
    } else {
      // Process as regular chat
      chatMutation.mutate(messageText);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setMessageText(prompt);
  };

  const handleClearHistory = () => {
    if (conversations.length === 0) return;
    if (confirm("Are you sure you want to clear the conversation history?")) {
      localStorage.removeItem(`jarvish-${currentUser?.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot", currentUser?.id] });
      toast({
        title: "Conversation cleared",
        description: "Chat history has been cleared",
      });
    }
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  if (!currentUser) return null;

  const windowSize = isMaximized 
    ? "w-[90vw] h-[90vh] max-w-5xl" 
    : "w-96 h-[600px]";

  return (
    <div className={`fixed z-40 font-sans ${isMaximized ? "inset-4 flex items-center justify-center" : "bottom-6 right-6"}`}>
      {isOpen ? (
        <div className={`bg-card border border-border rounded-xl shadow-2xl ${windowSize} flex flex-col animate-in slide-in-from-bottom-5 duration-300`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary via-primary/80 to-chart-2 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-lg animate-bounce">
                🤖
              </div>
              <div>
                <p className="text-white font-bold text-sm">Jarvish</p>
                <p className="text-white/70 text-xs">Eco-Assistant</p>
              </div>
            </div>
            <div className="flex gap-2">
              {conversations.length > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={handleClearHistory}
                  data-testid="button-clear-jarvish"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setIsMaximized(!isMaximized)}
                data-testid="button-maximize-jarvish"
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => {
                  setIsOpen(false);
                  setIsMaximized(false);
                }}
                data-testid="button-close-jarvish"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4" ref={scrollRef} style={{ scrollBehavior: "smooth" }}>
            <div className="space-y-4 w-full">
              {chatMutation.isError && (
                <div className="bg-destructive/20 border border-destructive/30 text-destructive-foreground rounded-lg p-3 text-xs animate-in fade-in">
                  <p className="font-semibold mb-1">⚠️ Jarvish Unavailable</p>
                  <p className="text-xs">Our AI assistant is experiencing issues. Please check back shortly.</p>
                </div>
              )}

              {conversations.length === 0 && !chatMutation.isPending ? (
                <div className="flex flex-col h-full">
                  {/* Welcome Header */}
                  <div className="text-center py-6 px-4 border-b border-border/50">
                    <div className="text-4xl mb-2">🤖</div>
                    <p className="text-foreground font-bold text-sm">Welcome to Jarvish!</p>
                    <p className="text-muted-foreground text-xs">Waiz Eco-Marketplace Assistant</p>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 px-3 pt-3 border-b border-border/30 bg-muted/20">
                    <Button
                      variant={viewTab === "chat" ? "default" : "ghost"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setViewTab("chat")}
                      data-testid="button-tab-quickstart"
                    >
                      Quick Start
                    </Button>
                    <Button
                      variant={viewTab === "faq" ? "default" : "ghost"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setViewTab("faq")}
                      data-testid="button-tab-faq"
                    >
                      <HelpCircle className="w-3 h-3 mr-1" />
                      FAQ
                    </Button>
                    <Button
                      variant={viewTab === "about" ? "default" : "ghost"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setViewTab("about")}
                      data-testid="button-tab-about"
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      About Waiz
                    </Button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                    {viewTab === "chat" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground font-medium">Popular Questions:</p>
                        {SUGGESTED_PROMPTS.map((prompt, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-8 justify-start text-left"
                            onClick={() => {
                              handleSuggestedPrompt(prompt);
                              setViewTab("chat");
                            }}
                            data-testid={`button-prompt-${idx}`}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    )}

                    {viewTab === "faq" && (
                      <div className="space-y-2">
                        {FAQ_ITEMS.map((item, idx) => (
                          <div key={idx} className="border border-border/50 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                              className="w-full text-left px-3 py-2 bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between group"
                              data-testid={`button-faq-${idx}`}
                            >
                              <span className="text-xs font-medium text-foreground">{item.question}</span>
                              <ChevronRight className={`w-3 h-3 transition-transform group-hover:text-primary ${expandedFAQ === idx ? "rotate-90" : ""}`} />
                            </button>
                            {expandedFAQ === idx && (
                              <div className="px-3 py-2 bg-background text-xs text-muted-foreground border-t border-border/30 animate-in slide-in-from-top-2">
                                {item.answer}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {viewTab === "about" && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-foreground mb-2">✨ Waiz Features</p>
                        {WAIZ_FEATURES.map((feature, idx) => (
                          <div key={idx} className="flex gap-3 p-2 bg-muted/30 rounded-lg border border-border/30 hover-elevate">
                            <div className="text-lg flex-shrink-0">{feature.icon}</div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{feature.title}</p>
                              <p className="text-xs text-muted-foreground">{feature.desc}</p>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-foreground">
                          <p className="font-semibold mb-1">🌱 Why Waiz?</p>
                          <p className="text-muted-foreground">Connect with your local recycling community, earn money from recyclables, and help build a sustainable Baguio City!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                conversations.map((conv, idx) => {
                  const isUser = conv.role === "user";
                  const timestamp = conv.timestamp ? new Date(conv.timestamp) : new Date();
                  const timeStr = timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateStr = timestamp.toLocaleDateString();
                  const isCopied = copiedId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 group`}
                    >
                      <div className="flex flex-col max-w-[75%]">
                        <div
                          className={`rounded-lg p-3 ${
                            isUser
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-muted text-foreground rounded-bl-none"
                          }`}
                        >
                          <p className="text-sm break-words whitespace-pre-wrap">{conv.content}</p>
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
                          <p
                            className={`text-xs ${
                              isUser ? "text-primary/70" : "text-muted-foreground"
                            }`}
                            title={`${dateStr} ${timeStr}`}
                          >
                            {timeStr}
                          </p>
                          {!isUser && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleCopyMessage(conv.content, conv.id)}
                              data-testid={`button-copy-message-${idx}`}
                              title="Copy message"
                            >
                              {isCopied ? (
                                <Check className="w-3 h-3 text-primary" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {chatMutation.isPending && (
                <div className="flex justify-start animate-in fade-in">
                  <div className="bg-muted text-foreground rounded-lg rounded-bl-none p-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm ml-1">Jarvish is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3 bg-background/50 backdrop-blur flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Ask Jarvish anything..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                data-testid="input-jarvish-message"
                disabled={chatMutation.isPending}
                className="text-sm h-10"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!messageText.trim() || chatMutation.isPending}
                data-testid="button-jarvish-send"
                className="h-10 w-10"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Press Enter to send
            </p>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-16 h-16 shadow-2xl animate-in fade-in zoom-in-75 duration-500 hover:scale-110 transition-transform"
          size="icon"
          data-testid="button-open-jarvish"
          title="Open Jarvish Assistant"
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">Ask</span>
          </div>
        </Button>
      )}
    </div>
  );
}
