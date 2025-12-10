/**
 * AWT CRM - Google Sheets Sync Script
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click Save (Ctrl+S)
 * 5. Run the "setup" function once (it will ask for permissions)
 * 6. Use the custom "AWT CRM" menu that appears in your sheet
 *
 * For daily auto-sync:
 * - In Apps Script, go to Triggers (clock icon)
 * - Add trigger: syncFromSupabase, Time-driven, Day timer, 6am-7am
 */

// ============ CONFIGURATION ============
const SUPABASE_URL = 'https://jmivthevbgxfnetmgjca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXZ0aGV2Ymd4Zm5ldG1namNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTkwMDEsImV4cCI6MjA4MDg5NTAwMX0.Nl5cDvOX-PGmi1KZjrnuOdA_6ZxnYim1WIRZ8Ogus-g';

// Email for daily digest (set your email here)
const DIGEST_EMAIL = 'derek@ancientwisdomtrust.org';

// ============ MENU SETUP ============
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('AWT CRM')
    .addItem('Sync from Supabase (Pull)', 'syncFromSupabase')
    .addItem('Push Changes to Supabase', 'pushToSupabase')
    .addSeparator()
    .addItem('Send Daily Digest Now', 'sendDailyDigest')
    .addSeparator()
    .addItem('Setup Sheets', 'setup')
    .addToUi();
}

// ============ INITIAL SETUP ============
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create Contacts sheet
  let contactsSheet = ss.getSheetByName('Contacts');
  if (!contactsSheet) {
    contactsSheet = ss.insertSheet('Contacts');
  }
  contactsSheet.clear();
  contactsSheet.appendRow([
    'ID', 'Name', 'Organization', 'Email', 'Twitter', 'Phone',
    'Category', 'Status', 'Priority', 'Estimated Amount',
    'Hook', 'Notes', 'Created', 'Updated'
  ]);
  contactsSheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#f3f4f6');
  contactsSheet.setFrozenRows(1);

  // Create Interactions sheet
  let interactionsSheet = ss.getSheetByName('Interactions');
  if (!interactionsSheet) {
    interactionsSheet = ss.insertSheet('Interactions');
  }
  interactionsSheet.clear();
  interactionsSheet.appendRow([
    'ID', 'Contact ID', 'Contact Name', 'Type', 'Outcome', 'Notes', 'Date'
  ]);
  interactionsSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f3f4f6');
  interactionsSheet.setFrozenRows(1);

  // Create Tasks sheet
  let tasksSheet = ss.getSheetByName('Tasks');
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet('Tasks');
  }
  tasksSheet.clear();
  tasksSheet.appendRow([
    'ID', 'Contact ID', 'Contact Name', 'Task', 'Due Date', 'Priority', 'Completed'
  ]);
  tasksSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f3f4f6');
  tasksSheet.setFrozenRows(1);

  // Create Dashboard sheet
  let dashSheet = ss.getSheetByName('Dashboard');
  if (!dashSheet) {
    dashSheet = ss.insertSheet('Dashboard');
    ss.setActiveSheet(dashSheet);
    ss.moveActiveSheet(1);
  }
  dashSheet.clear();
  dashSheet.appendRow(['AWT Fundraising CRM Dashboard']);
  dashSheet.getRange(1, 1).setFontSize(18).setFontWeight('bold');
  dashSheet.appendRow(['']);
  dashSheet.appendRow(['Last Synced:', 'Never']);
  dashSheet.appendRow(['Total Contacts:', '=COUNTA(Contacts!A:A)-1']);
  dashSheet.appendRow(['Pipeline Value:', '=SUM(Contacts!J:J)']);
  dashSheet.appendRow(['Tasks Due:', '=COUNTIF(Tasks!G:G, FALSE)']);
  dashSheet.appendRow(['']);
  dashSheet.appendRow(['Pipeline by Status:']);
  dashSheet.appendRow(['Prospect', '=COUNTIF(Contacts!H:H, "prospect")']);
  dashSheet.appendRow(['Contacted', '=COUNTIF(Contacts!H:H, "contacted")']);
  dashSheet.appendRow(['Meeting', '=COUNTIF(Contacts!H:H, "meeting")']);
  dashSheet.appendRow(['Proposal', '=COUNTIF(Contacts!H:H, "proposal")']);
  dashSheet.appendRow(['Committed', '=COUNTIF(Contacts!H:H, "committed")']);

  // Initial sync
  syncFromSupabase();

  SpreadsheetApp.getUi().alert('Setup complete! Use the "AWT CRM" menu to sync data.');
}

// ============ SUPABASE API HELPERS ============
function supabaseGet(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const options = {
    method: 'get',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

function supabasePost(table, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const options = {
    method: 'post',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

function supabasePatch(table, id, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const options = {
    method: 'patch',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

// ============ SYNC FROM SUPABASE ============
function syncFromSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Sync Contacts
  const contacts = supabaseGet('contacts', 'order=priority.desc');
  let contactsSheet = ss.getSheetByName('Contacts');

  // Create sheet if it doesn't exist
  if (!contactsSheet) {
    contactsSheet = ss.insertSheet('Contacts');
    contactsSheet.appendRow([
      'ID', 'Name', 'Organization', 'Email', 'Twitter', 'Phone',
      'Category', 'Status', 'Priority', 'Estimated Amount',
      'Hook', 'Notes', 'Created', 'Updated'
    ]);
    contactsSheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#f3f4f6');
    contactsSheet.setFrozenRows(1);
  }

  // Clear existing data (keep header)
  const lastRow = contactsSheet.getLastRow();
  if (lastRow > 1) {
    contactsSheet.getRange(2, 1, lastRow - 1, 14).clear();
  }

  // Add contacts
  if (contacts.length > 0) {
    const contactRows = contacts.map(c => [
      c.id,
      c.name,
      c.organization || '',
      c.email || '',
      c.twitter || '',
      c.phone || '',
      c.category || 'individual',
      c.status || 'prospect',
      c.priority || 3,
      c.estimated_amount || 0,
      c.hook || '',
      c.notes || '',
      c.created_at ? new Date(c.created_at) : '',
      c.updated_at ? new Date(c.updated_at) : ''
    ]);
    contactsSheet.getRange(2, 1, contactRows.length, 14).setValues(contactRows);
  }

  // Create contact name lookup
  const contactMap = {};
  contacts.forEach(c => contactMap[c.id] = c.name);

  // Sync Interactions
  const interactions = supabaseGet('interactions', 'order=created_at.desc');
  let interactionsSheet = ss.getSheetByName('Interactions');

  // Create sheet if it doesn't exist
  if (!interactionsSheet) {
    interactionsSheet = ss.insertSheet('Interactions');
    interactionsSheet.appendRow([
      'ID', 'Contact ID', 'Contact Name', 'Type', 'Outcome', 'Notes', 'Date'
    ]);
    interactionsSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f3f4f6');
    interactionsSheet.setFrozenRows(1);
  }

  const intLastRow = interactionsSheet.getLastRow();
  if (intLastRow > 1) {
    interactionsSheet.getRange(2, 1, intLastRow - 1, 7).clear();
  }

  if (interactions.length > 0) {
    const intRows = interactions.map(i => [
      i.id,
      i.contact_id,
      contactMap[i.contact_id] || 'Unknown',
      i.type || '',
      i.outcome || '',
      i.notes || '',
      i.created_at ? new Date(i.created_at) : ''
    ]);
    interactionsSheet.getRange(2, 1, intRows.length, 7).setValues(intRows);
  }

  // Sync Tasks (Follow-ups)
  const tasks = supabaseGet('follow_ups', 'order=due_date.asc');
  let tasksSheet = ss.getSheetByName('Tasks');

  // Create sheet if it doesn't exist
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet('Tasks');
    tasksSheet.appendRow([
      'ID', 'Contact ID', 'Contact Name', 'Task', 'Due Date', 'Priority', 'Completed'
    ]);
    tasksSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f3f4f6');
    tasksSheet.setFrozenRows(1);
  }

  const taskLastRow = tasksSheet.getLastRow();
  if (taskLastRow > 1) {
    tasksSheet.getRange(2, 1, taskLastRow - 1, 7).clear();
  }

  if (tasks.length > 0) {
    const taskRows = tasks.map(t => [
      t.id,
      t.contact_id,
      contactMap[t.contact_id] || 'Unknown',
      t.task || '',
      t.due_date ? new Date(t.due_date) : '',
      t.priority || 3,
      t.completed || false
    ]);
    tasksSheet.getRange(2, 1, taskRows.length, 7).setValues(taskRows);
  }

  // Update dashboard
  let dashSheet = ss.getSheetByName('Dashboard');
  if (dashSheet) {
    dashSheet.getRange(3, 2).setValue(new Date());
  }

  SpreadsheetApp.getUi().alert(`Synced ${contacts.length} contacts, ${interactions.length} interactions, ${tasks.length} tasks`);
}

// ============ PUSH TO SUPABASE ============
function pushToSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contactsSheet = ss.getSheetByName('Contacts');

  const data = contactsSheet.getDataRange().getValues();
  const headers = data[0];
  let updated = 0;
  let created = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue; // Skip if no name

    const contact = {
      name: row[1],
      organization: row[2] || null,
      email: row[3] || null,
      twitter: row[4] || null,
      phone: row[5] || null,
      category: row[6] || 'individual',
      status: row[7] || 'prospect',
      priority: parseInt(row[8]) || 3,
      estimated_amount: parseFloat(row[9]) || 0,
      hook: row[10] || null,
      notes: row[11] || null
    };

    if (row[0]) {
      // Update existing
      supabasePatch('contacts', row[0], contact);
      updated++;
    } else {
      // Create new
      const result = supabasePost('contacts', contact);
      if (result && result[0] && result[0].id) {
        // Write the new ID back to the sheet
        contactsSheet.getRange(i + 1, 1).setValue(result[0].id);
        created++;
      }
    }
  }

  // Also push task completions
  const tasksSheet = ss.getSheetByName('Tasks');
  const taskData = tasksSheet.getDataRange().getValues();
  let tasksUpdated = 0;

  for (let i = 1; i < taskData.length; i++) {
    const row = taskData[i];
    if (!row[0]) continue;

    const completed = row[6] === true || row[6] === 'TRUE' || row[6] === 'true';
    supabasePatch('follow_ups', row[0], {
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null
    });
    tasksUpdated++;
  }

  SpreadsheetApp.getUi().alert(`Updated ${updated} contacts, created ${created} new contacts, updated ${tasksUpdated} tasks`);

  // Refresh from Supabase to get any server-side changes
  syncFromSupabase();
}

// ============ DAILY EMAIL DIGEST ============
function sendDailyDigest() {
  // Get tasks due today or overdue
  const tasks = supabaseGet('follow_ups', 'completed=eq.false&order=due_date.asc');
  const contacts = supabaseGet('contacts', 'order=priority.desc');

  // Create contact lookup
  const contactMap = {};
  contacts.forEach(c => contactMap[c.id] = c);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = [];
  const dueToday = [];
  const upcoming = [];

  tasks.forEach(t => {
    const dueDate = new Date(t.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const contact = contactMap[t.contact_id] || { name: 'Unknown' };
    const item = {
      task: t.task,
      contact: contact.name,
      email: contact.email,
      twitter: contact.twitter,
      dueDate: t.due_date
    };

    if (dueDate < today) {
      overdue.push(item);
    } else if (dueDate.getTime() === today.getTime()) {
      dueToday.push(item);
    } else {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      if (dueDate <= nextWeek) {
        upcoming.push(item);
      }
    }
  });

  // Get stale contacts (no interaction in 14+ days, not committed)
  const interactions = supabaseGet('interactions', 'order=created_at.desc');
  const lastInteraction = {};
  interactions.forEach(i => {
    if (!lastInteraction[i.contact_id]) {
      lastInteraction[i.contact_id] = new Date(i.created_at);
    }
  });

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const staleContacts = contacts.filter(c => {
    if (c.status === 'committed' || c.status === 'received') return false;
    const lastContact = lastInteraction[c.id];
    return !lastContact || lastContact < twoWeeksAgo;
  }).slice(0, 10); // Top 10 by priority

  // Build email HTML
  let html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #8B4513; border-bottom: 2px solid #D4A574;">AWT Fundraising - Daily Digest</h1>
      <p style="color: #666;">${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  `;

  // Overdue tasks
  if (overdue.length > 0) {
    html += `
      <h2 style="color: #dc3545;">Overdue (${overdue.length})</h2>
      <ul>
        ${overdue.map(t => `
          <li>
            <strong>${t.task}</strong> - ${t.contact}
            ${t.email ? `<br><a href="mailto:${t.email}">${t.email}</a>` : ''}
            ${t.twitter ? ` | <a href="https://twitter.com/${t.twitter.replace('@','')}">${t.twitter}</a>` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  // Due today
  if (dueToday.length > 0) {
    html += `
      <h2 style="color: #ffc107;">Due Today (${dueToday.length})</h2>
      <ul>
        ${dueToday.map(t => `
          <li>
            <strong>${t.task}</strong> - ${t.contact}
            ${t.email ? `<br><a href="mailto:${t.email}">${t.email}</a>` : ''}
            ${t.twitter ? ` | <a href="https://twitter.com/${t.twitter.replace('@','')}">${t.twitter}</a>` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  // Upcoming
  if (upcoming.length > 0) {
    html += `
      <h2 style="color: #17a2b8;">Coming Up This Week (${upcoming.length})</h2>
      <ul>
        ${upcoming.map(t => `
          <li>${t.task} - ${t.contact} (${new Date(t.dueDate).toLocaleDateString()})</li>
        `).join('')}
      </ul>
    `;
  }

  // Stale contacts
  if (staleContacts.length > 0) {
    html += `
      <h2 style="color: #6c757d;">Need Attention (No contact in 14+ days)</h2>
      <ul>
        ${staleContacts.map(c => `
          <li>
            <strong>${c.name}</strong> ${c.organization ? `(${c.organization})` : ''} - $${(c.estimated_amount || 0).toLocaleString()}
            ${c.email ? `<br><a href="mailto:${c.email}">${c.email}</a>` : ''}
            ${c.twitter ? ` | <a href="https://twitter.com/${c.twitter.replace('@','')}">${c.twitter}</a>` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  // Summary stats
  const pipeline = contacts.reduce((sum, c) => sum + (parseFloat(c.estimated_amount) || 0), 0);
  const byStatus = {};
  contacts.forEach(c => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });

  html += `
    <hr style="border: 1px solid #D4A574; margin: 20px 0;">
    <h2 style="color: #8B4513;">Pipeline Summary</h2>
    <p><strong>Total Pipeline:</strong> $${pipeline.toLocaleString()}</p>
    <p><strong>Contacts:</strong> ${contacts.length} total</p>
    <ul>
      <li>Prospect: ${byStatus.prospect || 0}</li>
      <li>Contacted: ${byStatus.contacted || 0}</li>
      <li>Meeting: ${byStatus.meeting || 0}</li>
      <li>Proposal: ${byStatus.proposal || 0}</li>
      <li>Committed: ${byStatus.committed || 0}</li>
    </ul>
    <p style="margin-top: 20px;">
      <a href="https://site-pp4v0f86q-dereklomas-projects.vercel.app/crm.html"
         style="background: #8B4513; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Open CRM Dashboard
      </a>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 30px;">
      Ancient Wisdom Trust Fundraising CRM
    </p>
  </div>
  `;

  // Send email
  GmailApp.sendEmail(
    DIGEST_EMAIL,
    `AWT Daily Digest - ${overdue.length} overdue, ${dueToday.length} due today`,
    `You have ${overdue.length} overdue tasks and ${dueToday.length} tasks due today. Open the CRM to view details.`,
    {
      htmlBody: html,
      name: 'AWT Fundraising CRM'
    }
  );

  SpreadsheetApp.getUi().alert(`Daily digest sent to ${DIGEST_EMAIL}`);
}

// ============ TRIGGER FOR DAILY DIGEST ============
// To set up automatic daily emails:
// 1. In Apps Script, click the clock icon (Triggers)
// 2. Click "+ Add Trigger"
// 3. Choose function: sendDailyDigest
// 4. Select event source: Time-driven
// 5. Select type: Day timer
// 6. Select time: 6am to 7am (or your preferred time)
// 7. Click Save
