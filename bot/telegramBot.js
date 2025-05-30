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

// Store user quiz state (question count, current question)
const userQuizState = new Map();

// Store user session state
const userSessionState = new Map();

// Function to fetch a random question from the backend
async function fetchRandomQuestion(category, usedQuestions) {
  try {
    const url = `${API_URL}/api/questions/random?category=${encodeURIComponent(
      category
    )}`;
    const response = await axios.get(url);

    if (!response.data || !response.data.question || !response.data.options) {
      return null;
    }

    // If this question has been used, try to get another one
    if (usedQuestions.has(response.data._id)) {
      return fetchRandomQuestion(category, usedQuestions);
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching question:", error.message);
    return null;
  }
}

// Function to fetch total questions count for a category
async function fetchCategoryQuestionCount(category) {
  try {
    const response = await axios.get(
      `${API_URL}/api/questions/count?category=${encodeURIComponent(category)}`
    );
    return response.data.count;
  } catch (error) {
    console.error("Error fetching question count:", error.message);
    return 0;
  }
}

// Function to create inline keyboard for question options
function createOptionsKeyboard(options) {
  if (!options || !Array.isArray(options)) {
    console.error("Invalid options");
    return Markup.inlineKeyboard([
      [Markup.button.callback("Error loading options", "error")],
    ]);
  }
  const buttons = options.map((option, index) => [
    Markup.button.callback(option, `ans_${index}`),
  ]);
  // Add exit button at the bottom
  buttons.push([Markup.button.callback("🚪 Exit Quiz", "exit_quiz")]);
  return Markup.inlineKeyboard(buttons);
}

// Function to check if user has an active session
async function checkUserSession(userId) {
  try {
    const response = await axios.get(`${API_URL}/api/session/check/${userId}`);
    return !response.data.expired;
  } catch (error) {
    console.error("Error checking session:", error.message);
    return false;
  }
}

// Function to show session expired message
async function showSessionExpiredMessage(ctx, userId) {
  const expiredMessage =
    `🔒 Session Required\n\n` +
    `❌ Your 3-minute session has expired.\n\n` +
    `To continue using the quiz:\n` +
    `1️⃣ Visit our website: ${WEB_URL}?userId=${userId}\n` +
    `2️⃣ Click the "Renew Bot" button\n` +
    `3️⃣ Return here to start quizzing!\n\n` +
    `Need help? Contact our support team.`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url("🔗 Renew Session", `${WEB_URL}?userId=${userId}`)],
    [Markup.button.callback("🔄 Check Session", "check_session")],
  ]);

  try {
    await ctx.editMessageText(expiredMessage, keyboard);
  } catch (editError) {
    await ctx.reply(expiredMessage, keyboard);
  }
}

// Function to start new session
async function startNewSession(userId) {
  try {
    const response = await axios.post(`${API_URL}/api/session/start`, {
      userId: userId,
    });
    console.log("New session started:", response.data);
    return true;
  } catch (error) {
    console.error("Error starting session:", error.message);
    return false;
  }
}

// Function to start a new quiz for a user
async function startQuiz(ctx, category) {
  try {
    const userId = ctx.from.id;
    const totalQuestions = await fetchCategoryQuestionCount(category);

    if (totalQuestions === 0) {
      await ctx.editMessageText(
        "Sorry, no questions found for this category.",
        mainKeyboard
      );
      return;
    }

    userQuizState.set(userId, {
      category,
      questionCount: 0,
      currentQuestion: null,
      usedQuestions: new Set(),
      totalQuestions: totalQuestions,
      ctx: ctx, // Store ctx for session checks
    });

    const question = await fetchRandomQuestion(
      category,
      userQuizState.get(userId).usedQuestions
    );

    if (!question) {
      await ctx.editMessageText(
        "Sorry, could not fetch a question. Please try again later.",
        mainKeyboard
      );
      return;
    }

    userQuizState.get(userId).currentQuestion = question;
    userQuizState.get(userId).usedQuestions.add(question._id);
    await ctx.editMessageText(
      `Category: ${category}\nTotal Questions: ${totalQuestions}\n\nQuestion ${
        userQuizState.get(userId).questionCount + 1
      }:\n\n${question.question}`,
      createOptionsKeyboard(question.options)
    );
  } catch (error) {
    console.error("Error in startQuiz:", error.message);
    throw error;
  }
}

// Modify the start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const hasActiveSession = await checkUserSession(userId);

  if (hasActiveSession) {
    await ctx.reply(
      "✅ Your session is active!\n\n" +
        "⏰ You have 3 minutes of access.\n" +
        "Choose an option from the menu below:",
      mainKeyboard
    );
  } else {
    // Start new session
    const sessionStarted = await startNewSession(userId);

    if (sessionStarted) {
      await ctx.reply(
        "👋 Welcome to PunjabiExamBot!\n\n" +
          "✅ Your session has been activated!\n" +
          "⏰ You have 3 minutes of access.\n\n" +
          "Choose an option from the menu below:",
        mainKeyboard
      );
    } else {
      await showSessionExpiredMessage(ctx, userId);
    }
  }
});

bot.action("main_menu", async (ctx) => {
  await ctx.editMessageText(
    "Welcome to PunjabiExamBot! Choose an option from the menu:",
    mainKeyboard
  );
});

bot.action("start_quiz", async (ctx) => {
  // This will be replaced with actual quiz logic later
  await ctx.editMessageText(
    "Please choose a category first:",
    categoriesKeyboard
  );
});

bot.action("choose_category", async (ctx) => {
  const userId = ctx.from.id;
  const hasActiveSession = await checkUserSession(userId);

  if (!hasActiveSession) {
    await showSessionExpiredMessage(ctx, userId);
    return;
  }

  await ctx.editMessageText("Please choose a category:", categoriesKeyboard);
});

// Handle session check button
bot.action("check_session", async (ctx) => {
  const userId = ctx.from.id;
  const hasActiveSession = await checkUserSession(userId);

  if (hasActiveSession) {
    await ctx.editMessageText(
      "✅ Your session is active!\n\n" +
        "⏰ You have 3 minutes of access.\n" +
        "Choose an option from the menu below:",
      mainKeyboard
    );
  } else {
    await showSessionExpiredMessage(ctx, userId);
  }
});

// Modify category selection to check session
bot.action(/cat_(.+)/, async (ctx) => {
  const userId = ctx.from.id;
  const hasActiveSession = await checkUserSession(userId);

  if (!hasActiveSession) {
    await showSessionExpiredMessage(ctx, userId);
    return;
  }

  const categoryMap = {
    ancient: "Ancient History of Punjab",
    gurus: "Sikh Gurus",
    banda: "Banda Singh Bahadur and Sikh Misls",
    ranjit: "Era of Maharaja Ranjit Singh",
    british: "British Rule and Freedom Struggle in Punjab",
    post_ind: "Post-Independence Punjab",
    geography: "Punjab's Geography, Culture and Heritage - Historical Context",
  };
  const category = categoryMap[ctx.match[1]];
  if (!category) {
    await ctx.editMessageText("Invalid category selected.", mainKeyboard);
    return;
  }

  try {
    await startQuiz(ctx, category);
  } catch (error) {
    console.error("Error starting quiz:", error);
    await ctx.editMessageText(
      "Sorry, there was an error starting the quiz. Please try again.",
      mainKeyboard
    );
  }
});

// Handle user's answer
bot.action(/ans_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const hasActiveSession = await checkUserSession(userId);

  if (!hasActiveSession) {
    await showSessionExpiredMessage(ctx, userId);
    return;
  }

  const userState = userQuizState.get(userId);
  if (!userState) {
    await ctx.editMessageText(
      "Quiz session not found. Please start a new quiz.",
      mainKeyboard
    );
    return;
  }

  const selectedIndex = parseInt(ctx.match[1]);
  const currentQuestion = userState.currentQuestion;
  const selectedAnswer = currentQuestion.options[selectedIndex];
  const isCorrect = selectedAnswer === currentQuestion.answer;

  let message = `Your answer: ${selectedAnswer}\n`;
  message += isCorrect
    ? "✅ Correct!"
    : `❌ Incorrect. The correct answer is: ${currentQuestion.answer}`;

  userState.questionCount++;

  // Check if we've used all questions
  if (userState.questionCount >= userState.totalQuestions) {
    message += `\n\nQuiz completed! You've answered all ${userState.totalQuestions} questions. Thank you for playing!`;
    userQuizState.delete(userId);
    await ctx.editMessageText(message, mainKeyboard);
    return;
  }

  // Fetch and ask the next question
  const nextQuestion = await fetchRandomQuestion(
    userState.category,
    userState.usedQuestions
  );
  if (nextQuestion) {
    userState.currentQuestion = nextQuestion;
    userState.usedQuestions.add(nextQuestion._id);
    await ctx.editMessageText(message);
    await ctx.reply(
      `Category: ${userState.category}\nTotal Questions: ${
        userState.totalQuestions
      }\n\nQuestion ${userState.questionCount + 1}:\n\n${
        nextQuestion.question
      }`,
      createOptionsKeyboard(nextQuestion.options)
    );
  } else {
    message += `\n\nQuiz completed! You've answered ${userState.questionCount} out of ${userState.totalQuestions} questions. Thank you for playing!`;
    userQuizState.delete(userId);
    await ctx.editMessageText(message, mainKeyboard);
  }
});

// Handle exit quiz
bot.action("exit_quiz", async (ctx) => {
  const userId = ctx.from.id;
  userQuizState.delete(userId);
  await ctx.editMessageText(
    "Quiz ended. You can start a new quiz by choosing a category.",
    mainKeyboard
  );
});

// Add a timer to check session expiration
setInterval(async () => {
  for (const [userId, state] of userQuizState.entries()) {
    try {
      const response = await axios.get(
        `${API_URL}/api/session/check/${userId}`
      );
      if (response.data.expired) {
        const ctx = state.ctx;
        if (ctx) {
          await showSessionExpiredMessage(ctx, userId);
          userQuizState.delete(userId);
        }
      }
    } catch (error) {
      console.error("Error in session check interval:", error.message);
    }
  }
}, 10000); // Check every 10 seconds for testing

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
