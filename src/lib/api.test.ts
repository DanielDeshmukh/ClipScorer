import { describe, it, expect } from 'vitest'
import { formatDuration, formatViews, getTimestampUrl } from './api'

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('pads single digits', () => {
    expect(formatDuration(61)).toBe('1:01')
  })
})

describe('formatViews', () => {
  it('formats millions', () => {
    expect(formatViews(1_500_000)).toBe('1.5M')
  })

  it('formats thousands', () => {
    expect(formatViews(25_000)).toBe('25.0K')
  })

  it('formats exact thousands', () => {
    expect(formatViews(1_000)).toBe('1.0K')
  })

  it('formats small numbers as-is', () => {
    expect(formatViews(999)).toBe('999')
  })

  it('formats zero', () => {
    expect(formatViews(0)).toBe('0')
  })
})

describe('getTimestampUrl', () => {
  it('builds timestamp URL from mm:ss', () => {
    const url = getTimestampUrl('https://youtube.com/watch?v=abc', '2:30')
    expect(url).toBe('https://youtube.com/watch?v=abc&t=150')
  })

  it('handles zero timestamp', () => {
    const url = getTimestampUrl('https://youtube.com/watch?v=abc', '0:00')
    expect(url).toBe('https://youtube.com/watch?v=abc&t=0')
  })

  it('handles large timestamp', () => {
    const url = getTimestampUrl('https://youtube.com/watch?v=abc', '10:15')
    expect(url).toBe('https://youtube.com/watch?v=abc&t=615')
  })
})
