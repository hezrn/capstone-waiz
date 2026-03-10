import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertItemSchema, insertRequestSchema, insertMessageSchema, insertChatbotConversationSchema, insertRateSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const user = await storage.createUser(userData);
      
      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  // Items routes
  app.get("/api/items", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const items = await storage.getItems(category);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch item" });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      const itemData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(itemData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create item" });
    }
  });

  app.patch("/api/items/:id", async (req, res) => {
    try {
      const updated = await storage.updateItem(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete item" });
    }
  });

  // Requests routes
  app.get("/api/requests", async (req, res) => {
    try {
      const requests = await storage.getRequests();
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch requests" });
    }
  });

  app.get("/api/requests/:id", async (req, res) => {
    try {
      const request = await storage.getRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch request" });
    }
  });

  app.post("/api/requests", async (req, res) => {
    try {
      const requestData = insertRequestSchema.parse(req.body);
      const request = await storage.createRequest(requestData);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create request" });
    }
  });

  app.patch("/api/requests/:id", async (req, res) => {
    try {
      const updated = await storage.updateRequest(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update request" });
    }
  });

  app.delete("/api/requests/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRequest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete request" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      // Ensure timestamps are serialized as ISO strings
      const serializedMessages = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
      }));
      res.json(serializedMessages);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/user/:userId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByUser(req.params.userId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      console.log("Message request body:", req.body);
      const messageData = insertMessageSchema.parse(req.body);
      console.log("Parsed message data:", messageData);
      const message = await storage.createMessage(messageData);
      // Ensure timestamp is serialized as ISO string
      const serializedMessage = {
        ...message,
        timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
      };
      res.status(201).json(serializedMessage);
    } catch (error: any) {
      console.error("Message error:", error);
      res.status(400).json({ message: error.message || "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      const updated = await storage.markMessageAsRead(req.params.id);
      if (!updated) {
        return res.status(404).json({ message: "Message not found" });
      }
      // Ensure timestamp is serialized as ISO string
      const serializedMessage = {
        ...updated,
        timestamp: updated.timestamp ? new Date(updated.timestamp).toISOString() : new Date().toISOString(),
      };
      res.json(serializedMessage);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update message" });
    }
  });

  // Chatbot routes
  app.get("/api/chatbot/:userId", async (req, res) => {
    try {
      const conversations = await storage.getChatbotConversation(req.params.userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch chatbot history" });
    }
  });

  // Chatbot command processor for sending messages
  app.post("/api/chatbot/process-command", async (req, res) => {
    try {
      const { userId, command } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const commandLower = command.toLowerCase();
      let sentMessage = false;
      let result: any = { success: false, message: "Command not recognized" };

      // Parse recipient and context from command
      // Patterns: "send message to [name] about [context]", "message [name] [context]"
      
      // Extract recipient name (after "to", "for", or between action and "about")
      const toMatch = commandLower.match(/(?:to|for)\s+([a-z\s]+?)(?:\s+about|\s+with|\s+regarding|$)/i);
      const nameMatch = commandLower.match(/message\s+([a-z\s]+?)(?:\s+about|\s+with|\s+regarding|$)/i);
      const recipientName = (toMatch?.[1] || nameMatch?.[1] || "").trim();

      // Extract context (after "about", "regarding", etc.)
      const aboutMatch = commandLower.match(/(?:about|regarding|with|that)\s+(.+?)(?:\s+status|$)/i);
      const statusMatch = commandLower.match(/(pending|accepted|completed|ready|pickup|cancel|interested)/i);
      const context = aboutMatch?.[1] || statusMatch?.[1] || "";

      if (!recipientName) {
        result = { 
          success: false, 
          message: "Please tell me who to message. Example: 'Send message to John about the cardboard boxes'"
        };
      } else {
        // Find recipient by name
        const allUsers = await storage.getAllUsers();
        const recipient = allUsers.find(u => u.name.toLowerCase().includes(recipientName));

        if (!recipient) {
          result = { 
            success: false, 
            message: `I couldn't find anyone named "${recipientName}". Try using their exact name.`
          };
        } else {
          // Generate ready-made message based on context
          let messageContent = "";

          if (context.includes("ready") || context.includes("pickup")) {
            messageContent = `Hi ${recipient.name}! We're ready to arrange pickup/collection whenever you are. Looking forward to working with you!`;
          } else if (context.includes("interested")) {
            messageContent = `Hi ${recipient.name}! I'm interested in your listing. Can we discuss details and arrange a time?`;
          } else if (context.includes("pending")) {
            messageContent = `Hi ${recipient.name}! Just checking on the status of our pending request. Are you still interested?`;
          } else if (context.includes("accepted")) {
            messageContent = `Hi ${recipient.name}! Great! Your request has been accepted. When would you like to proceed?`;
          } else if (context.includes("completed")) {
            messageContent = `Hi ${recipient.name}! Thank you for the transaction! It was a pleasure working with you.`;
          } else if (context.includes("cancel")) {
            messageContent = `Hi ${recipient.name}! I need to cancel our arrangement. I apologize for any inconvenience.`;
          } else {
            // Generic message
            messageContent = `Hi ${recipient.name}! I wanted to reach out about ${context || "your listing"}. Can we discuss?`;
          }

          // Send the message
          try {
            const newMessage = await storage.createMessage({
              senderId: userId,
              senderName: user.name,
              receiverId: recipient.id,
              receiverName: recipient.name,
              content: messageContent,
              read: "false",
            });

            sentMessage = true;
            result = {
              success: true,
              message: `Message sent to ${recipient.name}!`,
              sentMessage: newMessage,
              content: messageContent,
            };
          } catch (err: any) {
            result = { 
              success: false, 
              message: `Failed to send message: ${err.message}`
            };
          }
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Command processing error:", error);
      res.status(400).json({ message: error.message || "Failed to process command" });
    }
  });

  app.post("/api/chatbot/chat", async (req, res) => {
    try {
      const { userId, message: userMessage } = req.body;

      // Save user message
      await storage.createChatbotConversation({
        userId,
        role: "user",
        content: userMessage,
      });

      // Get conversation history for context
      const history = await storage.getChatbotConversation(userId);

      // Fetch real system data to give chatbot context
      const items = await storage.getItems();
      const rates = await storage.getRates();
      const allUsers = await storage.getAllUsers();
      const requests = await storage.getRequests();

      // Format data for the system prompt
      const itemsList = items.map(item => `- ${item.title} (${item.category}): ${item.price} by ${item.sellerName}`).join("\n");
      const ratesList = rates.map(rate => `- ${rate.material}: ${rate.price}`).join("\n");
      const userStats = {
        totalUsers: allUsers.length,
        households: allUsers.filter(u => u.userType === "household").length,
        junkshops: allUsers.filter(u => u.userType === "junkshop").length,
      };
      const requestStats = {
        pending: requests.filter(r => r.status === "Pending").length,
        completed: requests.filter(r => r.status === "Completed").length,
        cancelled: requests.filter(r => r.status === "Cancelled").length,
      };

      // Detect language - check for Tagalog keywords
      const detectLanguage = (msg: string): "english" | "tagalog" => {
        const message = msg.toLowerCase().trim();
        const tagalogKeywords = [
          "magkano", "ano", "paano", "saan", "kailan", "bakit", "sino", 
          "bote", "plastic", "papel", "araw", "tanggal", "bayad", "presyo",
          "bili", "benta", "basura", "recycl", "kapaligiran", "tubig",
          "metal", "lata", "kartoon", "bulas", "matériyal", "palit",
          "huling", "ngayon", "bumili", "magbenta", "handog", "tara"
        ];
        return tagalogKeywords.some(keyword => message.includes(keyword)) ? "tagalog" : "english";
      };

      // Smart off-topic detector
      const isOffTopicQuestion = (msg: string): boolean => {
        const message = msg.toLowerCase().trim();
        
        // Waiz-related keywords that indicate on-topic questions
        const onTopicKeywords = [
          // Platform features
          "waiz", "marketplace", "item", "product", "sell", "buy", "listing",
          "browse", "rate", "price", "cost", "material", "recyclable",
          // Actions
          "request", "collection", "pickup", "message", "chat", "contact",
          // Recycling/Eco
          "recycl", "eco", "green", "sustainable", "waste", "environment", "garbage",
          // User/Account
          "household", "junkshop", "account", "profile", "user type",
          // Help/Features
          "help", "feature", "guide", "how to", "how do", "how can", "how does",
          // Rate List related
          "rates", "prices", "metal", "plastic", "paper", "glass", "cardboard", "copper",
          // General platform
          "statistic", "platform", "app", "user", "baguio",
          // Messaging/Request commands (be specific)
          "reach out", "send message", "send ",
          // Status keywords
          "pending", "accepted", "completed", "cancel", "interested", "ready",
          // Tagalog keywords
          "magkano", "paano", "bote", "presyo", "bili", "benta", "recycl", "kapaligiran"
        ];

        // Check if message contains any on-topic keywords
        const hasOnTopicKeyword = onTopicKeywords.some(keyword => message.includes(keyword));
        
        // If no on-topic keyword found, it's likely off-topic
        return !hasOnTopicKeyword;
      };

      // Smart fallback function for when OpenAI is unavailable
      const getSmartFallbackResponse = (msg: string): string => {
        const message = msg.toLowerCase().trim();
        const language = detectLanguage(msg);

        // Check if question is off-topic FIRST
        if (isOffTopicQuestion(msg)) {
          if (language === "tagalog") {
            return `Pasensya, hindi ko masasagot ang tanong na iyon. Magtanong lang ng kahit anong bagay tungkol sa Waiz app.`;
          }
          return `Sorry, I cannot answer something like that. Please ask me anything related to the Waiz app.`;
        }

        // Message/Contact commands
        if (message.includes("send message") || message.includes("message ") || message.includes("tell ") || message.includes("contact ") || message.includes("reach out")) {
          if (language === "tagalog") {
            return `Tutulong ako magpadala ng mensahe! Gamitin ang mga ito:\n\n• "Magpadala ng mensahe kay Maria tungkol sa cardboard"\n• "Message kay John tungkol sa pickup"\n• "Sabihin kay Alex interested kami sa items"\n\nKomprehensible na keywords:\n• ready/pickup → "Handa na kami para sa pickup"\n• interested → "Interesado kami sa items mo"\n• pending → Status update\n• completed → Salamat mensahe\n• cancel → Cancellation\n\nSubukan na!`;
          }
          return `I can help you send a message! Use commands like:\n\n• "Send message to Maria about the cardboard boxes"\n• "Message John about ready pickup"\n• "Tell Alex we're interested in their items"\n\nContext keywords I understand:\n• ready/pickup → "We're ready for pickup"\n• interested → "I'm interested in your items"\n• pending/accepted → Status updates\n• completed → Thank you message\n• cancel → Cancellation message\n\nTry it now!`;
        }

        // Items/Marketplace questions
        if (message.includes("item") || message.includes("product") || message.includes("available") || message.includes("browse")) {
          const itemDescriptions = items.slice(0, 3).map(i => `• ${i.title} (${i.category}): ${i.price}`).join("\n");
          if (language === "tagalog") {
            return `Mayroon kaming ${items.length} items sa marketplace!\n\nTop listings:\n${itemDescriptions}\n\nGusto mo bang maghanap ng mas marami o specific na kategorya?`;
          }
          return `We have ${items.length} items available in our marketplace!\n\nTop listings:\n${itemDescriptions}\n\nWould you like to browse more or know about a specific category?`;
        }

        // Rate/Price questions - Check if asking about specific material
        if (message.includes("rate") || message.includes("price") || message.includes("cost") || message.includes("much") || message.includes("magkano") || message.includes("presyo") || message.includes("bottle") || message.includes("bote") || message.includes("paper") || message.includes("papel") || message.includes("cardboard") || message.includes("kartoon")) {
          // Check for specific materials in the question
          let specificMaterial = null;
          let specificPrice = null;
          
          if (message.includes("white paper") || message.includes("white") && message.includes("paper")) {
            specificMaterial = "White Paper";
            specificPrice = "₱8.00";
          } else if (message.includes("pet bottle") || message.includes("plastic bottle") || message.includes("bote")) {
            specificMaterial = "PET Bottle";
            specificPrice = "₱16.00";
          } else if (message.includes("cardboard") || message.includes("carton") || message.includes("kartoon")) {
            specificMaterial = "Cartons";
            specificPrice = "₱2.50";
          } else if (message.includes("newspaper")) {
            specificMaterial = "Newspaper";
            specificPrice = "₱4.00";
          } else if ((message.includes("mixed") || message.includes("assorted")) && message.includes("paper")) {
            specificMaterial = "Mixed Paper";
            specificPrice = "₱1.50";
          }
          
          if (specificMaterial) {
            if (language === "tagalog") {
              return `Ang presyo ng ${specificMaterial} ay ${specificPrice} per kilo. Mayroon ka bang dadalhin?`;
            }
            return `The price of ${specificMaterial} is ${specificPrice} per kilo. Do you have some to sell?`;
          } else {
            // General price question - mention checking Rate List
            if (language === "tagalog") {
              return `Para sa lahat ng presyo, tingnan ang Rate List page para makita ang current prices ng lahat ng materials. Ano ang materyal mo?`;
            }
            return `Check the Rate List page to see current prices for all materials. What material do you have?`;
          }
        }

        // Selling questions
        if (message.includes("sell") || message.includes("list") || message.includes("how to sell") || message.includes("magbenta") || message.includes("benta")) {
          if (language === "tagalog") {
            return `Simple lang: Browse Items → Add Item → Fill title, category, price → Done! Buyers will contact you. Gaano karaming items gusto mong ibenta?`;
          }
          return `It's easy: Browse Items → Add Item → Fill in title, category, and price → Done! Buyers will contact you. How many items do you want to sell?`;
        }

        // Collection/Request questions
        if (message.includes("collection") || message.includes("request") || message.includes("pickup")) {
          if (language === "tagalog") {
            return `Go to My Requests → Create Request → Describe items + address + preferred date → Submit! Junkshops makikita at makikipag-ugnayan kung interested. Mayroon ka ba ngayon?`;
          }
          return `Go to My Requests → Create Request → Describe items, address, and date → Submit! Junkshops will see and contact you if interested. Do you have items ready?`;
        }

        // General chat/messaging help (but not command-based)
        if ((message.includes("how") || message.includes("help")) && (message.includes("message") || message.includes("chat"))) {
          if (language === "tagalog") {
            return `Find them → Click 'Contact Seller' or 'Message' → Start chat → Arrange pickup! Paano mo gusto makipag-usap?`;
          }
          return `Find them → Click 'Contact Seller' or 'Message' → Chat → Arrange pickup! What would you like to ask them?`;
        }

        // Recycling/Eco questions with material details
        if (message.includes("recycl") || message.includes("eco") || message.includes("green") || message.includes("sustainable") || message.includes("kapaligiran")) {
          if (language === "tagalog") {
            return `Recycling ay napakaganda! Baawasan landfill waste, nagsasave ng resources, kumikita ka pa. Win-win! Anong materyal mo?`;
          }
          return `Recycling is great! Reduces waste, saves resources, and you earn money too. It's a win-win! What materials do you have?`;
        }

        // User type questions
        if (message.includes("household") || message.includes("junkshop") || message.includes("account type") || message.includes("difference")) {
          if (language === "tagalog") {
            return `🏠 Households: Buy/sell recyclables, create collection requests, flexible. 🏪 Junkshops: List items, respond to requests, update prices. Both can buy & sell! Alin ang type mo?`;
          }
          return `🏠 Households: Buy/sell recyclables, create collection requests, flexible. 🏪 Junkshops: List items, respond to requests, update prices. Both can do both! Which are you?`;
        }

        // Feature/Help questions
        if (message.includes("help") || message.includes("feature") || message.includes("how") || message.includes("guide")) {
          if (language === "tagalog") {
            return `📊 Rate List - Prices | 📦 Marketplace - Browse & sell | 📝 Requests - Collection orders | 💬 Messages - Chat | 👤 Profile - Your account. Ano ang gusto mo?`;
          }
          return `📊 Rate List - Prices | 📦 Marketplace - Browse & sell | 📝 Requests - Collection orders | 💬 Messages - Chat | 👤 Profile - Your account. What interests you?`;
        }

        // Statistics questions
        if (message.includes("statistic") || message.includes("user") || message.includes("how many")) {
          if (language === "tagalog") {
            return `${userStats.totalUsers} users (${userStats.households} households, ${userStats.junkshops} junkshops), ${items.length} items listed, ${requestStats.pending} pending requests. Gusto ka bang sumali?`;
          }
          return `${userStats.totalUsers} users (${userStats.households} households, ${userStats.junkshops} junkshops), ${items.length} items listed, ${requestStats.pending} pending requests. Want to join?`;
        }

        // Default response
        if (language === "tagalog") {
          return `Hi! Ako si Jarvish! Pwede akong tumulong sa recyclables prices, pano magbenta/bumili, collection requests, at paano gamitin ang Waiz. Anong gusto mo malaman? 🌱`;
        }
        return `Hi! I'm Jarvish, Waiz's assistant! I can help with recyclables, prices, selling/buying, collection requests, and how to use Waiz. What can I help you with? 🌱`;
      };

      let assistantMessage: string;

      // Try to use OpenAI if available
      if (openai) {
        try {
          // Build conversation history for context
          const messages = history.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }));

          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `You are Jarvish, the AI assistant for WAIZ Eco-Marketplace. Your goal: Answer questions ONLY about recyclables, prices, buying/selling, waste types, collection requests, and WAIZ features.

MARKET PRICES (Reference):
• White Paper: ₱8.00/kg
• Cartons (Brown/Corrugated): ₱2.50/kg
• Assorted/Mixed Paper: ₱1.50/kg
• Newspaper: ₱4.00/kg
• PET Bottle (Clean): ₱16.00/kg

CRITICAL RULES:
1. KEEP RESPONSES SHORT - 1-3 sentences maximum. Be conversational, not robotic.
2. CONTEXT-AWARE: If user already knows something, don't repeat. Only give details when asked.
3. SPECIFIC MATERIAL = SPECIFIC ANSWER: If user asks "magkano white paper?", answer ONLY white paper price. Don't list entire price list.
4. ALWAYS END WITH A FOLLOW-UP: Ask ONE short follow-up question like "Gusto mo pang malaman ang iba?" or "Anything else?"
5. NATURAL FLOW: Match user's language (Tagalog/English). Be helpful and friendly.
6. OFF-TOPIC: If not about Waiz/recyclables/buying/selling/environment, respond: "Sorry, I cannot answer something like that. Please ask me anything related to the Waiz app."

EXAMPLE RESPONSES:
User: "Magkano ang plastic bottles?"
Jarvish: "Ang presyo ng clean PET bottles ay ₱16.00 per kilo. Mayroon ka bang dadalhin?"

User: "How much white paper?"
Jarvish: "White paper goes for ₱8.00 per kilo. Do you have any to sell?"

User: "Tell me about Waiz"
Jarvish: "Waiz is an eco-marketplace where you can buy and sell recyclables with junkshops in Baguio. We have fair prices, messaging, and collection requests. What would you like to know more about?"

Platform Data (Real-time): ${userStats.totalUsers} users (${userStats.households} households, ${userStats.junkshops} junkshops), ${items.length} items, ${requestStats.pending} pending requests.`,
              },
              ...messages,
            ],
            max_tokens: 500,
            temperature: 0.7,
          });

          assistantMessage = response.choices[0].message.content || getSmartFallbackResponse(userMessage);
        } catch (openaiError: any) {
          console.warn("OpenAI API error:", openaiError.message);
          // Use smart fallback when OpenAI fails
          assistantMessage = getSmartFallbackResponse(userMessage);
        }
      } else {
        // No OpenAI available - use smart fallback
        assistantMessage = getSmartFallbackResponse(userMessage);
      }

      // Save assistant message
      await storage.createChatbotConversation({
        userId,
        role: "assistant",
        content: assistantMessage,
      });

      console.log("Chatbot response sent:", { userId, userMessage, assistantMessage });
      res.json({ message: assistantMessage });
    } catch (error: any) {
      console.error("Chatbot error:", error);
      res.status(400).json({ message: error.message || "Failed to process chatbot message" });
    }
  });

  // Rates routes
  app.get("/api/rates", async (req, res) => {
    try {
      const rates = await storage.getRates();
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch rates" });
    }
  });

  app.patch("/api/rates/:id", async (req, res) => {
    try {
      const updated = await storage.updateRate(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Rate not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update rate" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
