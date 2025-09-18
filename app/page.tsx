'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Option {
  id: number
  title: string
  description: string
  votes: number
}

export default function VotingPage() {
  const [options, setOptions] = useState<Option[]>([
    { id: 1, title: 'Calendar Conflicts Reporter', description: 'Automatically detects conflicts between on-call schedules and calendar events. Identifies when on-call personnel have scheduled time off and suggests replacements. Supports incident.io integration with Slack and email notifications.', votes: 0 },
    { id: 2, title: 'Alexa Incident Commander', description: 'Voice-powered incident management assistant using Alexa and incident.io. Get real-time incident status updates through natural voice commands. Perfect for hands-free operation during war rooms and on-call situations.', votes: 0 },
    { id: 3, title: 'Incident Scorecard Check', description: 'Analyzes incidents and their impact on service scorecard scores. Integrates Incident.io with Cortex.io to correlate incidents with service performance metrics. Generates comprehensive reports on operational readiness and security impacts.', votes: 0 }
  ])

  const [hasVoted, setHasVoted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fingerprint, setFingerprint] = useState('')
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0)

  // Generate device fingerprint
  const generateFingerprint = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    // Create a simple hash
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString()
  }

  // Check if user has already voted
  const checkVotingStatus = async (fp: string) => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('id')
        .eq('user_agent', fp)
        .limit(1)
      
      if (error) {
        console.error('Error checking voting status:', error)
        return false
      }
      
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking voting status:', error)
      return false
    }
  }

  // Load initial vote counts and set up real-time subscription
  useEffect(() => {
    const initializeApp = async () => {
      const fp = generateFingerprint()
      setFingerprint(fp)
      
      // Check if user has already voted
      const alreadyVoted = await checkVotingStatus(fp)
      setHasVoted(alreadyVoted)
      
      // Check localStorage as backup
      const localVoted = localStorage.getItem('buildon-voted')
      if (localVoted === 'true') {
        setHasVoted(true)
      }
      
      loadVoteCounts()
    }
    
    initializeApp()
    
    // Set up real-time subscription for vote changes with debouncing
    const subscription = supabase
      .channel('votes_channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'votes' 
        }, 
        () => {
          // Debounce vote count updates to prevent excessive API calls
          clearTimeout(window.voteUpdateTimeout)
          window.voteUpdateTimeout = setTimeout(() => {
            loadVoteCounts()
          }, 500) // Wait 500ms before updating
        }
      )
      .subscribe()

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const loadVoteCounts = async () => {
    try {
      // Query votes directly and count manually for accuracy
      const { data, error } = await supabase
        .from('votes')
        .select('option_id')
      
      if (error) {
        console.error('Error loading vote counts:', error)
        return
      }

      // Count votes for each option
      const voteCounts = { 1: 0, 2: 0, 3: 0 }
      if (data && Array.isArray(data)) {
        data.forEach((vote) => {
          if (vote.option_id >= 1 && vote.option_id <= 3) {
            voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
          }
        })
      }

      // Update options with actual counts
      setOptions(prev => 
        prev.map(option => ({
          ...option,
          votes: voteCounts[option.id] || 0
        }))
      )
    } catch (error) {
      console.error('Error loading vote counts:', error)
    }
  }

  const handleVote = async (optionId: number) => {
    if (hasVoted || isLoading) return

    setIsLoading(true)
    
    try {
      // Double-check if user has already voted
      const alreadyVoted = await checkVotingStatus(fingerprint)
      if (alreadyVoted) {
        setHasVoted(true)
        setIsLoading(false)
        return
      }

      // Optimistically update UI immediately
      setOptions(prev => 
        prev.map(option => 
          option.id === optionId 
            ? { ...option, votes: option.votes + 1 }
            : option
        )
      )

      // Insert vote into Supabase with fingerprint as user_agent
      const { error } = await supabase
        .from('votes')
        .insert([
          { 
            option_id: optionId,
            voter_ip: null, // Could add IP tracking on server-side
            user_agent: fingerprint // Store fingerprint to prevent duplicate votes
          }
        ])

      if (error) {
        console.error('Error submitting vote:', error)
        // Revert optimistic update on error
        setOptions(prev => 
          prev.map(option => 
            option.id === optionId 
              ? { ...option, votes: option.votes - 1 }
              : option
          )
        )
        setIsLoading(false)
        return
      }

      // Set localStorage flag
      localStorage.setItem('buildon-voted', 'true')
      setHasVoted(true)
      
      // Don't reload counts immediately - let real-time updates handle it
    } catch (error) {
      console.error('Error submitting vote:', error)
      // Revert optimistic update on error
      setOptions(prev => 
        prev.map(option => 
          option.id === optionId 
            ? { ...option, votes: option.votes - 1 }
            : option
        )
      )
    }
    
    setIsLoading(false)
  }


  return (
    <div className="voting-container">
      <img src="/sev0-brand-inactive.avif" alt="SEV0" className="corner-logo" />
      <header className="header">
        <img src="/header-macbook-icons.avif" alt="Header Icons" className="header-image" />
        <h1>Build on incident.io</h1>
        <p>Choose your favorite project: Choose wisely, the winner gets a new MacBook Pro!</p>
      </header>

      <div className="options-grid">
        {options.map((option) => {
          const percentage = totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : '0.0'
          
          return (
            <div
              key={option.id}
              className={`option-card ${hasVoted ? 'voted' : ''}`}
            >
              <div className="option-image">
                {option.id === 1 ? (
                  <img
                    src="https://github.com/nikita-vanyasin/calendar-conflicts-reporter/raw/master/assets/email-ses-demo.png"
                    alt="Calendar Conflicts Reporter"
                    className="option-actual-image"
                  />
                ) : option.id === 2 ? (
                  <img
                    src="https://www.bhphotovideo.com/cdn-cgi/image/fit=scale-down,width=500,quality=95/https://www.bhphotovideo.com/images/images500x500/amazon_b07xkf5rm3_echo_4th_gen_with_1605694869_1599234.jpg"
                    alt="Alexa Incident Commander"
                    className="option-actual-image"
                  />
                ) : option.id === 3 ? (
                  <img
                    src="https://a-us.storyblok.com/f/1021527/2264x1310/7f32bb11d5/cortex-initiatives-when-scorecards-need-a-deadline_2.webp"
                    alt="Incident Scorecard Check"
                    className="option-actual-image"
                  />
                ) : (
                  <div className="placeholder-image">
                    <span>{option.title}</span>
                  </div>
                )}
              </div>
              
              <div className="option-content">
                <h2>
                  {option.id === 1 ? (
                    <>Calendar Conflicts<br />Reporter</>
                  ) : option.id === 2 ? (
                    <>Alexa Incident<br />Commander</>
                  ) : option.id === 3 ? (
                    <>Incident Scorecard<br />Check</>
                  ) : (
                    option.title
                  )}
                </h2>
                <p>{option.description}</p>
                {(option.id === 1 || option.id === 2 || option.id === 3) && (
                  <a
                    href={
                      option.id === 1
                        ? "https://github.com/nikita-vanyasin/calendar-conflicts-reporter"
                        : option.id === 2
                        ? "https://github.com/diverheart/alexa-incident-commander"
                        : "https://github.com/realpdm/incident-scorecard-check"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="repo-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on GitHub →
                  </a>
                )}

                {!hasVoted && (
                  <button
                    className="vote-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVote(option.id)
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Voting...' : 'Vote for this'}
                  </button>
                )}
                
                {hasVoted && (
                  <div className="vote-results">
                    <div className="vote-bar">
                      <div 
                        className="vote-fill" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="vote-percentage">{percentage}%</span>
                    <span className="vote-count">({option.votes} votes)</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasVoted && (
        <div className="total-votes-section">
          <p className="total-votes">Total Votes: {totalVotes}</p>
        </div>
      )}
    </div>
  )
}