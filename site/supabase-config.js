// Supabase Configuration for AWT Fundraising CRM
// Updated: 2025-12-17
const SUPABASE_URL = 'https://jmivthevbgxfnetmgjca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaXZ0aGV2Ymd4Zm5ldG1namNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTkwMDEsImV4cCI6MjA4MDg5NTAwMX0.Nl5cDvOX-PGmi1KZjrnuOdA_6ZxnYim1WIRZ8Ogus-g';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Alias for backward compatibility
window.supabaseClient = supabaseClient;

// CRM Functions
const AWTCRM = {
    // Contacts
    async getContacts(filters = {}) {
        let query = supabaseClient.from('contacts').select('*');
        if (filters.category) query = query.eq('category', filters.category);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.priority) query = query.gte('priority', filters.priority);
        const { data, error } = await query.order('priority', { ascending: false });
        if (error) console.error('Error fetching contacts:', error);
        return data || [];
    },

    async addContact(contact) {
        const { data, error } = await supabaseClient.from('contacts').insert([contact]).select();
        if (error) console.error('Error adding contact:', error);
        return data?.[0];
    },

    async updateContact(id, updates) {
        const { data, error } = await supabaseClient.from('contacts').update(updates).eq('id', id).select();
        if (error) console.error('Error updating contact:', error);
        return data?.[0];
    },

    // Interactions
    async logInteraction(interaction) {
        const { data, error } = await supabaseClient.from('interactions').insert([{
            ...interaction,
            created_at: new Date().toISOString()
        }]).select();
        if (error) console.error('Error logging interaction:', error);
        return data?.[0];
    },

    async getInteractions(contactId) {
        const { data, error } = await supabaseClient
            .from('interactions')
            .select('*')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });
        if (error) console.error('Error fetching interactions:', error);
        return data || [];
    },

    // Follow-ups
    async getUpcomingFollowUps(days = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const { data, error } = await supabaseClient
            .from('follow_ups')
            .select('*, contacts(name, email)')
            .lte('due_date', futureDate.toISOString())
            .eq('completed', false)
            .order('due_date', { ascending: true });
        if (error) console.error('Error fetching follow-ups:', error);
        return data || [];
    },

    async addFollowUp(followUp) {
        const { data, error } = await supabaseClient.from('follow_ups').insert([followUp]).select();
        if (error) console.error('Error adding follow-up:', error);
        return data?.[0];
    },

    async completeFollowUp(id) {
        const { data, error } = await supabaseClient
            .from('follow_ups')
            .update({ completed: true, completed_at: new Date().toISOString() })
            .eq('id', id)
            .select();
        if (error) console.error('Error completing follow-up:', error);
        return data?.[0];
    },

    // Donations
    async logDonation(donation) {
        const { data, error } = await supabaseClient.from('donations').insert([{
            ...donation,
            created_at: new Date().toISOString()
        }]).select();
        if (error) console.error('Error logging donation:', error);
        return data?.[0];
    },

    async getDonationStats() {
        const { data, error } = await supabaseClient
            .from('donations')
            .select('amount, status');
        if (error) console.error('Error fetching donations:', error);

        const stats = {
            total: 0,
            pledged: 0,
            received: 0,
            count: data?.length || 0
        };

        data?.forEach(d => {
            if (d.status === 'received') {
                stats.received += d.amount;
                stats.total += d.amount;
            } else if (d.status === 'pledged') {
                stats.pledged += d.amount;
            }
        });

        return stats;
    },

    // Pipeline summary
    async getPipelineSummary() {
        const { data, error } = await supabaseClient
            .from('contacts')
            .select('status, estimated_amount');
        if (error) console.error('Error fetching pipeline:', error);

        const pipeline = {
            prospect: { count: 0, value: 0 },
            contacted: { count: 0, value: 0 },
            meeting: { count: 0, value: 0 },
            proposal: { count: 0, value: 0 },
            committed: { count: 0, value: 0 },
            received: { count: 0, value: 0 }
        };

        data?.forEach(c => {
            if (pipeline[c.status]) {
                pipeline[c.status].count++;
                pipeline[c.status].value += c.estimated_amount || 0;
            }
        });

        return pipeline;
    },

    // Search
    async searchContacts(query) {
        const { data, error } = await supabaseClient
            .from('contacts')
            .select('*')
            .or(`name.ilike.%${query}%,organization.ilike.%${query}%,notes.ilike.%${query}%`);
        if (error) console.error('Error searching contacts:', error);
        return data || [];
    },

    // Migrate from localStorage
    async migrateFromLocalStorage() {
        const localProspects = JSON.parse(localStorage.getItem('awt_prospects') || '[]');
        if (localProspects.length === 0) return { migrated: 0 };

        const contacts = localProspects.map(p => ({
            name: p.name,
            organization: p.organization || '',
            email: p.email || '',
            category: p.category || 'individual',
            status: p.status || 'prospect',
            priority: p.priority || 3,
            estimated_amount: p.amount || 0,
            notes: p.notes || '',
            hook: p.hook || '',
            twitter: p.twitter || '',
            linkedin: p.linkedin || '',
            created_at: p.created_at || new Date().toISOString()
        }));

        const { data, error } = await supabaseClient.from('contacts').insert(contacts).select();
        if (error) {
            console.error('Migration error:', error);
            return { migrated: 0, error };
        }

        // Clear localStorage after successful migration
        localStorage.removeItem('awt_prospects');
        return { migrated: data.length };
    }
};

// Export for use
window.AWTCRM = AWTCRM;
console.log('AWT CRM initialized with Supabase');
