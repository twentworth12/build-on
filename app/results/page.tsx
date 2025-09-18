'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'

interface ChartData {
  name: string
  votes: number
  percentage: number
}

export default function ResultsPage() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Color palette for the bars
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']

  const loadResults = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('option_id')
      
      if (error) {
        console.error('Error loading results:', error)
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

      const total = voteCounts[1] + voteCounts[2] + voteCounts[3]
      setTotalVotes(total)

      // Format data for chart
      const formattedData = [
        { 
          name: 'Option 1', 
          votes: voteCounts[1], 
          percentage: total > 0 ? Math.round((voteCounts[1] / total) * 100) : 0 
        },
        { 
          name: 'Option 2', 
          votes: voteCounts[2], 
          percentage: total > 0 ? Math.round((voteCounts[2] / total) * 100) : 0 
        },
        { 
          name: 'Option 3', 
          votes: voteCounts[3], 
          percentage: total > 0 ? Math.round((voteCounts[3] / total) * 100) : 0 
        }
      ]

      setChartData(formattedData)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading results:', error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
    
    // Set up real-time subscription for vote changes
    const subscription = supabase
      .channel('results_channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'votes' 
        }, 
        () => {
          // Debounce updates
          clearTimeout(window.resultsUpdateTimeout)
          window.resultsUpdateTimeout = setTimeout(() => {
            loadResults()
          }, 1000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">
            Votes: {payload[0].value}
          </p>
          <p className="tooltip-percentage">
            {payload[0].payload.percentage}% of total
          </p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="results-container">
        <div className="loading">Loading results...</div>
      </div>
    )
  }

  return (
    <div className="results-container">
      <img src="/sev0-brand-inactive.avif" alt="SEV0" className="corner-logo" />
      
      <header className="results-header">
        <img src="/header-macbook-icons.avif" alt="Header Icons" className="header-image" />
        <h1>Live Voting Results</h1>
        <p>Build on incident.io</p>
        <div className="total-votes-display">
          Total Votes: {totalVotes}
        </div>
      </header>

      <div className="chart-section">
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="name" 
              stroke="#ffffff"
              fontSize={16}
              fontWeight={500}
              fontFamily="inherit"
            />
            <YAxis 
              stroke="#ffffff"
              fontSize={14}
              fontFamily="inherit"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="results-summary">
        {chartData.map((option, index) => (
          <div key={option.name} className="result-item">
            <div 
              className="result-color" 
              style={{ backgroundColor: colors[index] }}
            ></div>
            <div className="result-details">
              <h3>{option.name}</h3>
              <p>{option.votes} votes ({option.percentage}%)</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}