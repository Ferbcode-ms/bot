import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import axios from "axios";

console.log("BOT_TOKEN:", process.env.BOT_TOKEN); // Debug line

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEB_URL = process.env.WEB_URL || "https://yourwebsite.com"; // Replace with your actual website URL
const API_URL = process.env.API_URL || "http://localhost:3000"; // API URL with fallback to localhost

const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("📚 Choose Category", "choose_category")],
]);

const categoriesKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("Ancient History of Punjab", "cat_ancient")],
  [Markup.button.callback("Sikh Gurus", "cat_gurus")],
  [Markup.button.callback("Banda Singh Bahadur and Sikh Misls", "cat_banda")],
  [Markup.button.callback("Era of Maharaja Ranjit Singh", "cat_ranjit")],
  [
    Markup.button.callback(
      "British Rule and Freedom Struggle in Punjab",
      "cat_british"
    ),
  ],
  [Markup.button.callback("Post-Independence Punjab", "cat_post_ind")],
  [
    Markup.button.callback(
      "Punjab's Geography, Culture and Heritage",
      "cat_geography"
    ),
  ],
  [Markup.button.callback("🔙 Back to Menu", "main_menu")],
]);

// Removed in-memory user state - relying on backend for session checks
// const userQuizState = new Map();
// const userSessionState = new Map();

// Function to fetch a random question from the backend
async function fetchRandomQuestion(category) {
  try {
    // Note: The backend currently doesn't support filtering by used questions.
    // Fetching a truly *random* unused question within a single quiz session
    // would require backend changes to track quiz state per user.
    const url = `${API_URL}/api/questions/random?category=${encodeURIComponent(
      category
    )}`;
    const response = await axios.get(url);

    if (!response.data || !response.data.question || !response.data.options) {
      console.error(
        "Invalid response data for random question:",
        response.data
      );
      return null;
    }

    // The backend currently doesn't prevent fetching already used questions
    // within a single quiz session if the bot restarts or the backend logic
    // is updated to track quiz state. For now, we proceed with the fetched question.

    return response.data;
  } catch (error) {
    console.error("Error fetching random question:", error.message);
    return null;
  }
}

// Function to fetch total questions count for a category
async function fetchCategoryQuestionCount(category) {
  try {
    const response = await axios.get(
      `${API_URL}/api/questions/count?category=${encodeURIComponent(category)}`
    );
    if (response.data && typeof response.data.count === "number") {
      return response.data.count;
    }
    console.error("Invalid response data for question count:", response.data);
    return 0;
  } catch (error) {
    console.error("Error fetching question count:", error.message);
    return 0;
  }
}

// Function to create inline keyboard for question options
function createOptionsKeyboard(options) {
  if (!options || !Array.isArray(options) || options.length === 0) {
    console.error("Invalid or empty options array provided.");
    // Provide a fallback keyboard or handle this error appropriately
    return Markup.inlineKeyboard([
      [Markup.button.callback("❌ Error Loading Options", "error")],
    ]);
  }
  const buttons = options.map((option, index) => [
    Markup.button.callback(option, `ans_${index}`),
  ]);
  // Add exit button at the bottom
  buttons.push([Markup.button.callback("🚪 Exit Quiz", "exit_quiz")]);
  return Markup.inlineKeyboard(buttons);
}

// Function to check if user has an active session using backend API
async function checkUserSession(userId) {
  try {
    // Use a GET request as per the API route definition
    const response = await axios.get(`${API_URL}/api/session/check/${userId}`);
    // Expecting response.data = { expired: true/false }
    if (response.data && typeof response.data.expired === "boolean") {
      return !response.data.expired; // Return true if not expired
    }
    console.error("Invalid response data for session check:", response.data);
    return false; // Assume session is not active if response is invalid
  } catch (error) {
    // Log specific error details
    console.error(
      "Error checking session for user",
      userId,
      ":",
      error.message
    );
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Error request data:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error message:", error.message);
    }
    return false; // Assume session is not active on error
  }
}

// Function to show session expired message
async function showSessionExpiredMessage(ctx, userId, messageId) {
  const expiredMessage =
    `🔒 Session Required\n\n` +
    `❌ Your session has expired or is not active.\n\n` +
    `To continue using the quiz:\n` +
    `1️⃣ Visit our website: ${WEB_URL}?userId=${userId}\n` +
    `2️⃣ Click the "Activate Session" button\n` +
    `3️⃣ Return here to start quizzing!\n\n` +
    `Need help? Contact our support team.`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url("🔗 Activate Session", `${WEB_URL}?userId=${userId}`)],
    [Markup.button.callback("🔄 Check Session Status", "check_session")], // Updated button text
  ]);

  try {
    // Attempt to edit the message if messageId is provided, otherwise reply
    if (messageId) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        messageId,
        undefined,
        expiredMessage,
        { reply_markup: keyboard.reply_markup }
      );
    } else {
      await ctx.reply(expiredMessage, keyboard);
    }
  } catch (editError) {
    // If editing fails (e.g., message too old or already modified), send a new message
    console.error("Error editing message, sending new one:", editError.message);
    await ctx.reply(expiredMessage, keyboard);
  }
}

// Function to start new session via backend API
async function startNewSession(userId) {
  try {
    // Use a POST request as per the API route definition
    const response = await axios.post(`${API_URL}/api/session/start`, {
      userId: userId,
    });
    // Expecting response.data = { message: "...", startTime: "..." }
    if (response.data && response.data.message) {
      console.log("New session started/updated via API:", response.data);
      return true; // Indicate success based on API response structure
    }
    console.error("Invalid response data for start session:", response.data);
    return false; // Indicate failure if API response is invalid
  } catch (error) {
    // Log specific error details
    console.error(
      "Error starting new session for user",
      userId,
      ":",
      error.message
    );
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
    } else if (error.request) {
      console.error("Error request data:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
    return false; // Indicate failure on error
  }
}

// Function to start a new quiz for a user (simplified - relies on backend for questions)
async function startQuiz(ctx, category) {
  try {
    const userId = ctx.from.id;
    // We no longer store quiz state in memory here.
    // Quiz progress (question count, used questions within a single quiz run)
    // will reset if the bot restarts.

    const totalQuestions = await fetchCategoryQuestionCount(category);

    if (totalQuestions === 0) {
      await ctx.editMessageText(
        "Sorry, no questions found for this category.",
        mainKeyboard
      );
      return;
    }

    // Fetch the first question
    const question = await fetchRandomQuestion(category);

    if (!question) {
      await ctx.editMessageText(
        "Sorry, could not fetch a question. Please try again later.",
        mainKeyboard
      );
      return;
    }

    // Store the current question data temporarily with the context or as part of
    // the action data if passing to answer handlers. For simplicity here, we'll
    // just display the question. A robust quiz would pass question ID and options
    // in the callback_data or store state on the backend.

    // Display the question (simplified - does not track question number within a quiz run)
    await ctx.editMessageText(
      `Category: ${category}\n\nQuestion:\n\n${question.question}`,
      createOptionsKeyboard(question.options)
    );
  } catch (error) {
    console.error("Error in startQuiz:", error.message);
    // Inform the user about the error
    await ctx.reply("An error occurred while trying to start the quiz.");
  }
}

// Modify the start command to only check session and show main menu/expired message
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  // Always attempt to start/update a session first
  const sessionStarted = await startNewSession(userId);

  if (sessionStarted) {
    // If session started/updated successfully, show the main menu
    await ctx.reply(
      "👋 Welcome to PunjabiExamBot!\n\n" +
        "✅ Your session is active!\n" +
        "⏰ You have 3 minutes of access.\n\n" +
        "Choose an option from the menu below:",
      mainKeyboard
    );
  } else {
    // If starting/updating session failed, show the expired message
    await showSessionExpiredMessage(ctx, userId);
  }
});

bot.action("main_menu", async (ctx) => {
  // Acknowledge the callback query to remove the loading state on the button
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "Welcome to PunjabiExamBot! Choose an option from the menu:",
    mainKeyboard
  );
});

bot.action("start_quiz", async (ctx) => {
  await ctx.answerCbQuery();
  // This will be replaced with actual quiz logic later
  await ctx.editMessageText(
    "Please choose a category first:",
    categoriesKeyboard
  );
});

bot.action("choose_category", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const hasActiveSession = await checkUserSession(userId);

  if (!hasActiveSession) {
    // Pass the message ID to showSessionExpiredMessage to attempt editing the current message
    await showSessionExpiredMessage(
      ctx,
      userId,
      ctx.callbackQuery.message.message_id
    );
    return;
  }

  await ctx.editMessageText("Please choose a category:", categoriesKeyboard);
});

// Handle category selection actions (e.g., "cat_ancient", "cat_gurus", etc.)
bot.action(
  /cat_(ancient|gurus|banda|ranjit|british|post_ind|geography)/,
  async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const category = ctx.match[1];

    const hasActiveSession = await checkUserSession(userId);

    if (!hasActiveSession) {
      // Pass the message ID to showSessionExpiredMessage to attempt editing the current message
      await showSessionExpiredMessage(
        ctx,
        userId,
        ctx.callbackQuery.message.message_id
      );
      return;
    }

    // Start the quiz for the selected category
    await startQuiz(ctx, category);
  }
);

// Handle session check button action
bot.action("check_session", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const hasActiveSession = await checkUserSession(userId);

  if (hasActiveSession) {
    await ctx.editMessageText(
      "✅ Your session is currently active!",
      mainKeyboard
    );
  } else {
    // Pass the message ID to showSessionExpiredMessage to attempt editing the current message
    await showSessionExpiredMessage(
      ctx,
      userId,
      ctx.callbackQuery.message.message_id
    );
  }
});

// Handle answer button actions (e.g., "ans_0", "ans_1", etc.)
bot.action(/ans_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery("Processing answer..."); // Acknowledge callback immediately
  const userId = ctx.from.id;
  const chosenOptionIndex = parseInt(ctx.match[1], 10);

  const hasActiveSession = await checkUserSession(userId);

  if (!hasActiveSession) {
    // Pass the message ID to showSessionExpiredMessage to attempt editing the current message
    await showSessionExpiredMessage(
      ctx,
      userId,
      ctx.callbackQuery.message.message_id
    );
    return;
  }

  // --- Answer Checking Logic (Simplified) ---
  // In a real quiz bot, you would need to retrieve the question that was sent
  // to the user's message. This requires storing the question data (including
  // the correct answer) either in the bot's temporary state associated with
  // the message ID, or preferably, storing quiz progress state on the backend.
  // Since we removed in-memory state and the backend doesn't currently track
  // per-quiz-run state, we cannot reliably check the answer here without
  // refetching the question (which might return a different question).

  // For now, we will provide a placeholder response.
  // TODO: Implement robust answer checking by linking user's response
  //       to the specific question they were asked.

  // Example of how you *might* get the message content if needed (not reliable for answer checking)
  // const messageText = ctx.callbackQuery.message.text;
  // console.log("User answered on message:", messageText);

  await ctx.editMessageText(
    "Thanks for your answer!\n\n💡 Note: Answer checking is not yet fully implemented in this simplified version.\n\nChoose next step:",
    Markup.inlineKeyboard([
      [Markup.button.callback("📚 Choose Another Category", "choose_category")],
      [Markup.button.callback("🔙 Main Menu", "main_menu")],
    ])
  );

  // In a complete implementation:
  // 1. Retrieve the question associated with ctx.callbackQuery.message.message_id.
  // 2. Compare chosenOptionIndex with the correct answer index from the stored question.
  // 3. Provide feedback (correct/incorrect).
  // 4. Update quiz state (increment question count, add to used questions).
  // 5. Fetch and send the next question or end the quiz.
});

// Handle exit quiz action
bot.action("exit_quiz", async (ctx) => {
  await ctx.answerCbQuery();
  // Remove user's state if it were stored in memory (no longer needed)
  // userQuizState.delete(ctx.from.id);
  await ctx.editMessageText(
    "👋 You have exited the quiz. Choose an option from the menu:",
    mainKeyboard
  );
});

// Handle errors
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
});

// Start the bot
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
