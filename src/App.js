import React, { useState, useEffect } from 'react';
import { Heart, Calendar, Users, TrendingUp } from 'lucide-react';

export default function EventPlanningSurvey() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myVotes, setMyVotes] = useState(new Set());
  
  // Form state
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [willingToHost, setWillingToHost] = useState(false);
  const [willingToOrganize, setWillingToOrganize] = useState(false);
  const [timingPreference, setTimingPreference] = useState('');

  // Load events and votes from storage
  useEffect(() => {
    loadEvents();
    loadMyVotes();
  }, []);

  const loadEvents = async () => {
    try {
      const result = await window.storage.get('survey-events', true);
      if (result && result.value) {
        setEvents(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('No events yet');
    }
    setLoading(false);
  };

  const loadMyVotes = () => {
    const saved = localStorage.getItem('myVotes');
    if (saved) {
      setMyVotes(new Set(JSON.parse(saved)));
    }
  };

  const saveEvents = async (updatedEvents) => {
    try {
      await window.storage.set('survey-events', JSON.stringify(updatedEvents), true);
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Failed to save events:', error);
    }
  };

  const handleSubmit = async () => {
    if (!eventName.trim() || !submitterName.trim()) {
      alert('Please fill in event name and your name');
      return;
    }

    const newEvent = {
      id: Date.now().toString(),
      name: eventName,
      description: description,
      submitter: submitterName,
      votes: 0,
      hosts: willingToHost ? [submitterName] : [],
      organizers: willingToOrganize ? [submitterName] : [],
      timingPreferences: timingPreference ? [{ name: submitterName, preference: timingPreference }] : [],
      createdAt: new Date().toISOString()
    };

    const updatedEvents = [...events, newEvent];
    await saveEvents(updatedEvents);

    // Reset form
    setEventName('');
    setDescription('');
    setWillingToHost(false);
    setWillingToOrganize(false);
    setTimingPreference('');
  };

  const handleVote = async (eventId) => {
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        const hasVoted = myVotes.has(eventId);
        return {
          ...event,
          votes: hasVoted ? event.votes - 1 : event.votes + 1
        };
      }
      return event;
    });

    await saveEvents(updatedEvents);

    // Update local votes
    const newVotes = new Set(myVotes);
    if (newVotes.has(eventId)) {
      newVotes.delete(eventId);
    } else {
      newVotes.add(eventId);
    }
    setMyVotes(newVotes);
    localStorage.setItem('myVotes', JSON.stringify([...newVotes]));
  };

  const handleVolunteerHost = async (eventId) => {
    const name = prompt('Enter your name to volunteer as host:');
    if (!name || !name.trim()) return;

    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        if (event.hosts.includes(name.trim())) {
          alert('You are already listed as a host for this event');
          return event;
        }
        return {
          ...event,
          hosts: [...event.hosts, name.trim()]
        };
      }
      return event;
    });

    await saveEvents(updatedEvents);
  };

  const handleVolunteerOrganize = async (eventId) => {
    const name = prompt('Enter your name to volunteer to help organize:');
    if (!name || !name.trim()) return;

    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        if (!event.organizers) {
          event.organizers = [];
        }
        if (event.organizers.includes(name.trim())) {
          alert('You are already listed as an organizer for this event');
          return event;
        }
        return {
          ...event,
          organizers: [...event.organizers, name.trim()]
        };
      }
      return event;
    });

    await saveEvents(updatedEvents);
  };

  const handleAddTiming = async (eventId) => {
    const name = prompt('Enter your name:');
    if (!name || !name.trim()) return;
    
    const preference = prompt('Enter your timing preference (e.g., "Weekends in December", "Evenings only"):');
    if (!preference || !preference.trim()) return;

    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          timingPreferences: [...event.timingPreferences, { name: name.trim(), preference: preference.trim() }]
        };
      }
      return event;
    });

    await saveEvents(updatedEvents);
  };

  const sortedEvents = [...events].sort((a, b) => b.votes - a.votes);
  const totalVotes = events.reduce((sum, event) => sum + event.votes, 0);

  const exportToCSV = () => {
    if (events.length === 0) {
      alert('No events to export');
      return;
    }

    // Create CSV header
    const headers = ['Event Name', 'Description', 'Submitted By', 'Votes', 'Interested in Hosting', 'Interested in Organizing', 'Timing Preferences'];
    
    // Create CSV rows
    const rows = sortedEvents.map(event => {
      const hosts = event.hosts.join('; ');
      const organizers = (event.organizers || []).join('; ');
      const timingPrefs = event.timingPreferences
        .map(pref => `${pref.name}: ${pref.preference}`)
        .join('; ');
      
      return [
        `"${event.name.replace(/"/g, '""')}"`,
        `"${event.description.replace(/"/g, '""')}"`,
        `"${event.submitter.replace(/"/g, '""')}"`,
        event.votes,
        `"${hosts}"`,
        `"${organizers}"`,
        `"${timingPrefs}"`
      ].join(',');
    });

    // Combine header and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cluster-g-events-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Cluster G 💛 - Social Event Ideas</h1>
          <p className="text-gray-600">Submit your ideas and vote for events you'd like to attend!</p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Events</p>
                <p className="text-3xl font-bold text-indigo-600">{events.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-indigo-200" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Votes</p>
                <p className="text-3xl font-bold text-pink-600">{totalVotes}</p>
              </div>
              <Heart className="w-12 h-12 text-pink-200" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Most Popular</p>
                <p className="text-lg font-bold text-purple-600 truncate">
                  {sortedEvents[0]?.name || 'None yet'}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event List */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Ideas</h2>
            {events.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No events yet. Be the first to submit an idea!
              </div>
            ) : (
              <div className="space-y-4">
                {sortedEvents.map((event) => (
                  <div key={event.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800">{event.name}</h3>
                        <p className="text-sm text-gray-500">Suggested by {event.submitter}</p>
                      </div>
                      <button
                        onClick={() => handleVote(event.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                          myVotes.has(event.id)
                            ? 'bg-pink-100 text-pink-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-pink-50'
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 ${myVotes.has(event.id) ? 'fill-current' : ''}`}
                        />
                        <span className="font-semibold">{event.votes}</span>
                      </button>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 mb-4">{event.description}</p>
                    )}

                    <div className="space-y-3 mb-4">
                      {event.hosts.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Interested in hosting:</p>
                            <p className="text-sm text-gray-600">{event.hosts.join(', ')}</p>
                          </div>
                        </div>
                      )}

                      {event.organizers && event.organizers.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Interested in organizing:</p>
                            <p className="text-sm text-gray-600">{event.organizers.join(', ')}</p>
                          </div>
                        </div>
                      )}

                      {event.timingPreferences.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Timing preferences:</p>
                            {event.timingPreferences.map((pref, idx) => (
                              <p key={idx} className="text-sm text-gray-600">
                                <span className="font-medium">{pref.name}:</span> {pref.preference}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleVolunteerHost(event.id)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium"
                      >
                        Volunteer to Host
                      </button>
                      <button
                        onClick={() => handleVolunteerOrganize(event.id)}
                        className="px-3 py-1 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors text-sm font-medium"
                      >
                        Volunteer to Organize
                      </button>
                      <button
                        onClick={() => handleAddTiming(event.id)}
                        className="px-3 py-1 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors text-sm font-medium"
                      >
                        Add Timing Preference
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Event Form */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Submit Event Idea</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Game Night, Hiking Trip"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Describe your event idea..."
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timing Preference</label>
                  <input
                    type="text"
                    value={timingPreference}
                    onChange={(e) => setTimingPreference(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Weekends in December"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="host"
                    checked={willingToHost}
                    onChange={(e) => setWillingToHost(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="host" className="ml-2 text-sm text-gray-700">
                    I'm interested in hosting (finding venue/space)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="organize"
                    checked={willingToOrganize}
                    onChange={(e) => setWillingToOrganize(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="organize" className="ml-2 text-sm text-gray-700">
                    I'm interested in helping organize (planning/coordination)
                  </label>
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors font-medium"
                >
                  Submit Event Idea
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="text-center mt-8">
          <button
            onClick={exportToCSV}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to CSV
          </button>
        </div>
      </div>
    </div>
  );
}