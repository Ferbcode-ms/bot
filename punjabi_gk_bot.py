import logging
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters, CallbackQueryHandler
import random

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

def load_questions_from_json():
    """Load questions from JSON file and organize them by category."""
    questions = {}
    try:
        with open('punjab_history_quiz_grouped_by_category.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
            for category, category_questions in data.items():
                questions[category] = []
                for q in category_questions:
                    question_data = {
                        "question": q['question'],
                        "options": q['options'],
                        "answer": q['answer']
                    }
                    questions[category].append(question_data)
    except Exception as e:
        logger.error(f"Error loading questions from JSON: {e}")
        return {}
    return questions

# Load questions from JSON
QUESTIONS = load_questions_from_json()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /start is issued."""
    user = update.effective_user
    await update.message.reply_text(f"ਸਤ ਸ੍ਰੀ ਅਕਾਲ {user.first_name}! ਮੈਂ ਤੁਹਾਡਾ ਪੰਜਾਬੀ GK ਬੋਟ ਹਾਂ। /categories ਕਮਾਂਡ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਇੱਕ ਸ਼੍ਰੇਣੀ ਚੁਣੋ।")

async def categories(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send available categories when the command /categories is issued."""
    keyboard = [[InlineKeyboardButton(category, callback_data=category)] for category in QUESTIONS.keys()]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("ਉਪਲਬਧ ਸ਼੍ਰੇਣੀਆਂ:", reply_markup=reply_markup)

async def quiz(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a random question from the selected category."""
    if context.args and context.args[0] in QUESTIONS:
        category = context.args[0]
        question_data = random.choice(QUESTIONS[category])
        question_text = f"{question_data['question']}\n\n"
        keyboard = []
        for option in question_data['options']:
            keyboard.append([InlineKeyboardButton(option, callback_data=f"{category}_{option}")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(question_text, reply_markup=reply_markup)
    else:
        await update.message.reply_text("ਕਿਰਪਾ ਕਰਕੇ /categories ਦੀ ਵਰਤੋਂ ਕਰੋ ਅਤੇ ਇੱਕ ਸ਼੍ਰੇਣੀ ਚੁਣੋ।")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /help is issued."""
    await update.message.reply_text("ਇਹ ਬੋਟ ਤੁਹਾਨੂੰ ਪੰਜਾਬੀ GK ਸਵਾਲਾਂ ਦਾ ਜਵਾਬ ਦੇਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ। /quiz ਕਮਾਂਡ ਦੀ ਵਰਤੋਂ ਕਰੋ।")

async def handle_answer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle user's answer to the quiz question."""
    user_answer = update.message.text.strip()
    # Check if the answer matches any of the sample answers
    for category, data in QUESTIONS.items():
        if user_answer == data['answer']:
            await update.message.reply_text("ਸਹੀ ਜਵਾਬ! ਬਹੁਤ ਵਧੀਆ!")
            return
    await update.message.reply_text("ਗਲਤ ਜਵਾਬ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle button callbacks."""
    query = update.callback_query
    await query.answer()
    data = query.data.split('_', 2)
    
    # Handle special commands first
    if data[0] == "exit":
        await query.edit_message_text(text="ਤੁਹਾਡਾ ਧੰਨਵਾਦ! ਫਿਰ ਮਿਲਾਂਗੇ। /start ਕਮਾਂਡ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਦੁਬਾਰਾ ਸ਼ੁਰੂ ਕਰੋ।")
        return
    elif data[0] == "change_categories":
        # Create new message with categories
        keyboard = [[InlineKeyboardButton(category, callback_data=f"category_{category}")] for category in QUESTIONS.keys()]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            text="ਉਪਲਬਧ ਸ਼੍ਰੇਣੀਆਂ:\nਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸ਼੍ਰੇਣੀ ਚੁਣੋ:",
            reply_markup=reply_markup
        )
        return

    # Handle category and question buttons
    if data[0] == "category":
        category = data[1]
    else:
        category = data[0]

    # Check if the category exists
    if category not in QUESTIONS:
        keyboard = [[InlineKeyboardButton(category, callback_data=f"category_{category}")] for category in QUESTIONS.keys()]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            text="ਉਪਲਬਧ ਸ਼੍ਰੇਣੀਆਂ:\nਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸ਼੍ਰੇਣੀ ਚੁਣੋ:",
            reply_markup=reply_markup
        )
        return

    context.user_data['current_category'] = category

    if len(data) == 1 or data[0] == "category":
        # User clicked on a category button
        question_data = random.choice(QUESTIONS[category])
        context.user_data['last_question'] = question_data
        question_text = f"{question_data['question']}\n\n"
        keyboard = []
        for option in question_data['options']:
            keyboard.append([InlineKeyboardButton(option, callback_data=f"{category}_{option}")])
        # Add Exit and Change Categories buttons
        keyboard.append([
            InlineKeyboardButton("ਬਾਹਰ ਜਾਓ (Exit)", callback_data="exit"),
            InlineKeyboardButton("ਸ਼੍ਰੇਣੀਆਂ ਬਦਲੋ (Change Categories)", callback_data="change_categories")
        ])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=question_text, reply_markup=reply_markup)
    elif data[1] == 'next':
        # User clicked on the Next button
        question_data = random.choice(QUESTIONS[category])
        context.user_data['last_question'] = question_data
        question_text = f"{question_data['question']}\n\n"
        keyboard = []
        for option in question_data['options']:
            keyboard.append([InlineKeyboardButton(option, callback_data=f"{category}_{option}")])
        # Add Exit and Change Categories buttons
        keyboard.append([
            InlineKeyboardButton("ਬਾਹਰ ਜਾਓ (Exit)", callback_data="exit"),
            InlineKeyboardButton("ਸ਼੍ਰੇਣੀਆਂ ਬਦਲੋ (Change Categories)", callback_data="change_categories")
        ])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=question_text, reply_markup=reply_markup)
    else:
        # User clicked on an option button
        user_answer = data[1]
        last_question = context.user_data.get('last_question')
        
        if last_question and user_answer in last_question['options']:
            if user_answer == last_question['answer']:
                feedback = "ਸਹੀ ਜਵਾਬ! ਬਹੁਤ ਵਧੀਆ!"
            else:
                feedback = f"ਗਲਤ ਜਵਾਬ। ਸਹੀ ਜਵਾਬ {last_question['answer']} ਹੈ।"
            
            # Add Next, Exit and Change Categories buttons
            next_keyboard = [
                [InlineKeyboardButton("ਅਗਲਾ ਸਵਾਲ (Next)", callback_data=f"{category}_next")],
                [
                    InlineKeyboardButton("ਬਾਹਰ ਜਾਓ (Exit)", callback_data="exit"),
                    InlineKeyboardButton("ਸ਼੍ਰੇਣੀਆਂ ਬਦਲੋ (Change Categories)", callback_data="change_categories")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(next_keyboard)
            await query.edit_message_text(text=feedback, reply_markup=reply_markup)
        else:
            # If something goes wrong, show categories again
            keyboard = [[InlineKeyboardButton(category, callback_data=f"category_{category}")] for category in QUESTIONS.keys()]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.edit_message_text(
                text="ਉਪਲਬਧ ਸ਼੍ਰੇਣੀਆਂ:\nਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸ਼੍ਰੇਣੀ ਚੁਣੋ:",
                reply_markup=reply_markup
            )

def main() -> None:
    """Start the bot."""
    # Create the Application and pass it your bot's token.
    application = Application.builder().token("7216252360:AAEv-H8yiHRSWVGu_yYxsMPdiODUsrA_7K8").build()

    # on different commands - answer in Telegram
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("categories", categories))
    application.add_handler(CommandHandler("quiz", quiz))
    application.add_handler(CommandHandler("help", help_command))

    # on non command i.e message - handle the answer
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_answer))

    # on button callback
    application.add_handler(CallbackQueryHandler(button_callback))

    # Run the bot until the user presses Ctrl-C
    application.run_polling()

if __name__ == "__main__":
    main() 