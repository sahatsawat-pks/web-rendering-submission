# Rich Text Support for Quiz Questions

## Overview
The quiz system now supports rich text formatting for questions and explanations, allowing instructors to create more engaging and visually appealing quiz content. It also supports importing questions from GIFT format (Moodle) and displaying code blocks with syntax highlighting.

## Features

### Text Formatting
- **Bold** text
- *Italic* text
- `Inline code`
- Colored text

### Lists
- Bullet lists
- Numbered lists

### Headings
- H2 headings
- H3 headings

### Code Blocks
- Multi-line code blocks with syntax highlighting
- Supports multiple programming languages (JavaScript, Python, Java, etc.)
- Proper formatting and indentation

### Links
- Hyperlinks to external resources

### GIFT Format Import
- Import questions directly from Moodle GIFT format
- Supports multiple choice, short answer, and true/false questions
- Automatic conversion to quiz system format

## How to Use

### For Instructors (Admin Pages)

#### Creating Questions with Rich Text

1. Navigate to any subject's quiz management page (e.g., `/admin/itcs123/quiz`)
2. Select a lab and click "Add Question" or edit an existing question
3. Use the rich text editor toolbar to format your question and explanation:
   - Click the **B** button for bold text
   - Click the *I* button for italic text
   - Use the `</>` button for inline code
   - Use the 📄 button for code blocks
   - Use the list buttons for bullet or numbered lists
   - Click the link button to add hyperlinks
   - Use the color palette button to change text color
   - Select H2 or H3 for headings

#### Adding Code Blocks

1. Click the code block button (📄) in the toolbar
2. Type or paste your code
3. The code will be automatically syntax-highlighted
4. Press Enter twice to exit the code block

Example:
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```

#### Importing Questions from GIFT Format

1. Navigate to the quiz management page for your subject
2. Select a lab
3. Make sure you have created at least one category
4. Click the "📥 Import GIFT" button
5. In the import modal:
   - Click "View Example" to see GIFT format examples
   - Paste your GIFT formatted questions
   - Select the target category
   - Click "Parse & Preview" to validate the format
   - Click "Import" to add the questions

**GIFT Format Example:**
```
What is the capital of France? {
=Paris
~London
~Berlin
~Madrid
}

What does this code print: console.log("Hello")? {
=Hello
~"Hello"
~undefined
}
```

**Supported GIFT Features:**
- Multiple choice questions with `=` for correct and `~` for wrong answers
- Short answer questions
- True/False questions
- Feedback/explanations with `#` symbol
- Categories with `$CATEGORY:` directive
- Code in questions (use proper escaping or HTML entities)

### For Students

Questions with rich text formatting will be displayed automatically with proper styling. Code blocks will appear with syntax highlighting for better readability.

## Implementation Details

### Components

1. **RichTextEditor** (`src/components/RichTextEditor.tsx`)
   - Rich text editing component using TipTap
   - Provides toolbar with formatting options including code blocks
   - Used in admin quiz management pages

2. **RichTextDisplay** (`src/components/RichTextDisplay.tsx`)
   - Sanitized HTML renderer using DOMPurify
   - Displays rich text content safely with code syntax highlighting
   - Used in both admin preview and student quiz pages

3. **GiftImportModal** (`src/components/GiftImportModal.tsx`)
   - Modal component for importing GIFT format questions
   - Includes parser preview and validation
   - Shows example GIFT format for reference

### Libraries

**GIFT Parser** (`src/lib/giftParser.ts`)
- Parses GIFT format text into structured question objects
- Handles multiple choice, short answer, true/false questions
- Supports feedback, categories, and special characters

### Dependencies

- `@tiptap/react` - TipTap core React integration
- `@tiptap/starter-kit` - Basic editor extensions
- `@tiptap/extension-link` - Link support
- `@tiptap/extension-text-style` - Text styling
- `@tiptap/extension-color` - Text color
- `@tiptap/extension-code-block` - Code block support
- `@tiptap/extension-code-block-lowlight` - Syntax highlighting
- `lowlight` - Syntax highlighting engine
- `dompurify` - HTML sanitization for security

### Security

All rich text content is sanitized using DOMPurify before rendering to prevent XSS attacks. Only safe HTML tags and attributes are allowed, including code blocks.

## Updated Files

### Admin Pages (Quiz Management)
- All admin quiz pages now support GIFT import and rich text
- Import button available when categories exist

### Student Pages (Quiz Taking)
- All student quiz pages render rich text and code blocks properly
- Syntax highlighting applied automatically

### New Files
- `/src/lib/giftParser.ts` - GIFT format parser
- `/src/components/GiftImportModal.tsx` - Import modal component

### Styling
- `/src/app/globals.css` - Added code block and syntax highlighting styles

## Backward Compatibility

The system is fully backward compatible. Existing quiz questions without rich text formatting will continue to display normally as plain text.

## Tips for Creating Quality Quiz Questions

1. **Use code blocks** for any programming questions to improve readability
2. **Add explanations** with formatting to help students learn from mistakes
3. **Import from Moodle** if you already have GIFT format questions
4. **Test your questions** in student view to ensure proper formatting
5. **Use inline code** for variable names, function names, or short snippets
6. **Use headings** to organize complex questions with multiple parts
