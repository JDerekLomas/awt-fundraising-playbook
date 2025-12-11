/**
 * AWT Ambassador Prospect Submission Form
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to Google Forms (forms.google.com)
 * 2. Create a new form
 * 3. Click the 3-dot menu → Script editor
 * 4. Paste this entire script
 * 5. Save and run setupForm() once
 * 6. Share the form with your ambassadors
 *
 * Ambassadors:
 * - albert@ancientwisdomtrust.org (Albert Lin)
 * - luke@ancientwisdomtrust.org (Luke Barrington)
 * - leo@ancientwisdomtrust.org (Leo Trottier)
 * - eli@ancientwisdomtrust.org (Eli Spencer)
 * - tim@ancientwisdomtrust.org (Tim Mullen)
 * - qasim@ancientwisdomtrust.org (Qasim Anwar)
 */

// Run this function ONCE to set up the form
function setupForm() {
  const form = FormApp.getActiveForm();

  // Clear existing items if re-running
  const items = form.getItems();
  items.forEach(item => form.deleteItem(item));

  // Form settings
  form.setTitle('AWT Prospect Submission')
      .setDescription(
        '🎯 $10K Matching Gift Campaign (Dec 10-31)\n\n' +
        'Submit contacts who might support the Ancient Wisdom Trust.\n' +
        'Derek will review and draft personalized outreach for your approval.\n\n' +
        'Remember: We\'re raising $500K to digitize 5,000 Renaissance texts.\n' +
        '$500 = 1 book digitized | $1,000 = 1 expert translation\n' +
        'Every gift is MATCHED up to $10,000!'
      )
      .setConfirmationMessage(
        'Thank you! Derek will review this submission and get back to you with a draft outreach message.\n\n' +
        'Keep the prospects coming - every connection helps!'
      )
      .setCollectEmail(true)
      .setLimitOneResponsePerUser(false);

  // Section 1: Your Info
  form.addSectionHeaderItem()
      .setTitle('About You');

  form.addMultipleChoiceItem()
      .setTitle('Your Name')
      .setChoiceValues([
        'Albert Lin',
        'Luke Barrington',
        'Leo Trottier',
        'Eli Spencer',
        'Tim Mullen',
        'Qasim Anwar',
        'Derek Lomas'
      ])
      .setRequired(true);

  // Section 2: Prospect Info
  form.addSectionHeaderItem()
      .setTitle('Prospect Information');

  form.addTextItem()
      .setTitle('Prospect Name')
      .setHelpText('Full name of the person you\'re recommending')
      .setRequired(true);

  form.addTextItem()
      .setTitle('Email (if known)')
      .setHelpText('Their email address, if you have it');

  form.addTextItem()
      .setTitle('Twitter/X Handle')
      .setHelpText('e.g., @username');

  form.addTextItem()
      .setTitle('LinkedIn URL')
      .setHelpText('e.g., linkedin.com/in/username');

  form.addTextItem()
      .setTitle('Organization/Company')
      .setHelpText('Where do they work? (if relevant)');

  // Section 3: Connection & Context
  form.addSectionHeaderItem()
      .setTitle('Connection & Context');

  form.addParagraphTextItem()
      .setTitle('How do you know them?')
      .setHelpText('Friend, colleague, met at an event, follow online, etc.')
      .setRequired(true);

  form.addMultipleChoiceItem()
      .setTitle('How strong is your connection?')
      .setChoiceValues([
        'Close friend/family - can intro warmly',
        'Professional contact - have worked together',
        'Acquaintance - have met/interacted',
        'Online only - follow each other',
        'No direct connection - but they\'d be interested'
      ])
      .setRequired(true);

  form.addCheckboxItem()
      .setTitle('Why would they care about AWT?')
      .setChoiceValues([
        'Interested in Renaissance/history',
        'Works in AI/tech',
        'Cares about knowledge preservation',
        'Into philosophy/esoterica',
        'Philanthropist/donor type',
        'Academic/researcher',
        'Book collector/rare books',
        'Just a generous person',
        'Other (explain below)'
      ])
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('Anything else we should know?')
      .setHelpText('Personal context, best way to approach them, topics to mention or avoid, etc.');

  // Section 4: Giving Capacity
  form.addSectionHeaderItem()
      .setTitle('Potential (Optional)');

  form.addMultipleChoiceItem()
      .setTitle('Estimated giving capacity')
      .setHelpText('Your best guess - this helps us prioritize')
      .setChoiceValues([
        'Small gift ($50-250)',
        'Medium gift ($250-1,000)',
        'Major gift ($1,000-5,000)',
        'Leadership gift ($5,000+)',
        'Not sure'
      ]);

  form.addMultipleChoiceItem()
      .setTitle('Would you be willing to send the outreach?')
      .setHelpText('Derek can draft it, you review and send from your @ancientwisdomtrust.org email')
      .setChoiceValues([
        'Yes - draft something for me to send',
        'Maybe - let me see the draft first',
        'No - Derek should reach out directly',
        'Let\'s discuss'
      ])
      .setRequired(true);

  Logger.log('Form setup complete! Form URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());
}

// Triggered when form is submitted
function onFormSubmit(e) {
  const responses = e.response.getItemResponses();
  const timestamp = e.response.getTimestamp();
  const email = e.response.getRespondentEmail();

  // Build response object
  const data = {};
  responses.forEach(response => {
    const title = response.getItem().getTitle();
    data[title] = response.getResponse();
  });

  // Send notification email to Derek
  const subject = `🎯 New AWT Prospect: ${data['Prospect Name']} (from ${data['Your Name']})`;

  const body = `
New prospect submission from the Ambassador Form!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBMITTED BY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ambassador: ${data['Your Name']}
Email: ${email}
Submitted: ${timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROSPECT INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${data['Prospect Name']}
Email: ${data['Email (if known)'] || 'Not provided'}
Twitter: ${data['Twitter/X Handle'] || 'Not provided'}
LinkedIn: ${data['LinkedIn URL'] || 'Not provided'}
Organization: ${data['Organization/Company'] || 'Not provided'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONNECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
How they know them: ${data['How do you know them?']}
Connection strength: ${data['How strong is your connection?']}
Why they\'d care: ${Array.isArray(data['Why would they care about AWT?']) ? data['Why would they care about AWT?'].join(', ') : data['Why would they care about AWT?']}
Additional context: ${data['Anything else we should know?'] || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POTENTIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estimated capacity: ${data['Estimated giving capacity'] || 'Not specified'}
Willing to send outreach: ${data['Would you be willing to send the outreach?']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
1. Add to CRM (prospects table)
2. Draft personalized outreach
3. Send draft to ${data['Your Name']} for review
4. Track in pipeline

Form responses spreadsheet: [Link to your responses spreadsheet]
  `;

  // Send to Derek
  GmailApp.sendEmail(
    'derek@ancientwisdomtrust.org',
    subject,
    body
  );

  // Optional: Also add to a Google Sheet for tracking
  // addToSheet(data, email, timestamp);
}

// Optional: Add responses to a tracking sheet
function addToSheet(data, submitterEmail, timestamp) {
  const sheetId = 'YOUR_SHEET_ID_HERE'; // Replace with your Google Sheet ID
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Prospects') ||
                SpreadsheetApp.openById(sheetId).insertSheet('Prospects');

  // Add headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp',
      'Submitted By',
      'Submitter Email',
      'Prospect Name',
      'Prospect Email',
      'Twitter',
      'LinkedIn',
      'Organization',
      'How They Know Them',
      'Connection Strength',
      'Why They\'d Care',
      'Additional Context',
      'Estimated Capacity',
      'Willing to Send',
      'Status'
    ]);
  }

  sheet.appendRow([
    timestamp,
    data['Your Name'],
    submitterEmail,
    data['Prospect Name'],
    data['Email (if known)'] || '',
    data['Twitter/X Handle'] || '',
    data['LinkedIn URL'] || '',
    data['Organization/Company'] || '',
    data['How do you know them?'],
    data['How strong is your connection?'],
    Array.isArray(data['Why would they care about AWT?']) ? data['Why would they care about AWT?'].join(', ') : data['Why would they care about AWT?'],
    data['Anything else we should know?'] || '',
    data['Estimated giving capacity'] || '',
    data['Would you be willing to send the outreach?'],
    'New' // Status column for tracking
  ]);
}

// Create trigger for form submissions (run once)
function createTrigger() {
  const form = FormApp.getActiveForm();
  ScriptApp.newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();
  Logger.log('Trigger created! Form submissions will now send email notifications.');
}
