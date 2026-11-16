import { describe, expect, it } from 'vitest'
import { centsToDecimalString, divideCents, formatMoney, parseMoney, sumCents } from './money'

describe('parseMoney', () => {
  it.each([
    ['50', 5000],
    ['+$50', 5000],
    ['-25', -2500],
    ['-$25.5', -2550],
    ['$-25.05', -2505],
    ['$0', 0],
    ['-0', 0],
    ['1,250.75', 125075],
    ['.5', 50],
    ['0.01', 1],
    ['  12.30 ', 1230],
  ])('parses %j as %i cents', (input, cents) => {
    expect(parseMoney(input)).toBe(cents)
  })

  it.each(['', 'abc', '1.234', '--5', '5-', '$', '.', '1e5', '12.3.4', '9999999999999'])('rejects %j', (input) => {
    expect(parseMoney(input)).toBeNull()
  })

  it('avoids float error that naive parsing would hit', () => {
    // parseFloat('0.29') * 100 === 28.999999999999996
    expect(parseMoney('0.29')).toBe(29)
    expect(parseMoney('1.15')).toBe(115)
  })
})

describe('sumCents', () => {
  it('adds exactly where floats drift', () => {
    // 0.1 + 0.2 !== 0.3 in floating point, but 10 + 20 === 30 in cents.
    expect(sumCents([10, 20])).toBe(30)
    const many = Array.from({ length: 1000 }, () => 1) // 1000 x $0.01
    expect(sumCents(many)).toBe(1000)
  })

  it('handles positive and negative results together', () => {
    expect(sumCents([5000, -2500, 0, 1234, -1234])).toBe(2500)
  })

  it('rejects non-integer cents', () => {
    expect(() => sumCents([1.5])).toThrow(TypeError)
  })
})

describe('divideCents', () => {
  it('rounds half away from zero', () => {
    expect(divideCents(5, 2)).toBe(3)
    expect(divideCents(-5, 2)).toBe(-3)
    expect(divideCents(100, 3)).toBe(33)
    expect(divideCents(-100, 3)).toBe(-33)
  })
  it('throws on divide by zero', () => {
    expect(() => divideCents(1, 0)).toThrow(RangeError)
  })
})

describe('centsToDecimalString', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [-5, '-0.05'],
    [125075, '1250.75'],
    [-2500, '-25.00'],
  ])('%i -> %s', (cents, s) => expect(centsToDecimalString(cents)).toBe(s))
})

describe('formatMoney', () => {
  it('formats with signs', () => {
    expect(formatMoney(5000, 'USD', { signed: true })).toBe('+$50.00')
    expect(formatMoney(-2500, 'USD', { signed: true })).toBe('-$25.00')
    expect(formatMoney(0, 'USD', { signed: true })).toBe('$0.00')
  })
  it('trims whole amounts when asked', () => {
    expect(formatMoney(5000, 'USD', { trimWhole: true })).toBe('$50')
    expect(formatMoney(5050, 'USD', { trimWhole: true })).toBe('$50.50')
  })
  it('supports other currencies', () => {
    expect(formatMoney(123456, 'EUR')).toBe('€1,234.56')
    expect(formatMoney(-100, 'GBP')).toBe('-£1.00')
  })
})
