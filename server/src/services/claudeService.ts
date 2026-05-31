import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { Question, Topic, Difficulty } from '../types';

const TOPIC_LABELS: Record<Topic, string> = {
  what_is_ai: 'What is AI',
  machine_learning: 'Machine Learning',
  neural_networks: 'Neural Networks',
  ai_in_daily_life: 'AI in Daily Life',
  ai_ethics: 'AI Ethics',
};

const GRADE_BANDS: Record<Difficulty, string> = {
  beginner: 'Grades 6-7',
  intermediate: 'Grades 8-9',
  advanced: 'Grade 10',
};

const SYSTEM_PROMPT = `You are an educational quiz question generator for a school AI literacy game.
Your audience is students aged 11-16 (grades 6-10).
Rules: factually accurate, age-appropriate, exactly 4 options, exactly 1 correct, plausible distractors, fun facts conversational.
Return ONLY valid JSON — no markdown, no commentary.`;

class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async generateQuestions(topic: Topic, difficulty: Difficulty, count: number): Promise<Question[]> {
    const topicLabel = TOPIC_LABELS[topic];
    const gradeBand = GRADE_BANDS[difficulty];

    const userPrompt = `Generate ${count} multiple-choice quiz questions about: "${topicLabel}".
Difficulty: ${difficulty} (targeting ${gradeBand}).
Return JSON array: [{ "id": 1, "question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correct": "A", "fun_fact": "..." }]
Vary which letter (A/B/C/D) is correct. Questions must be unique.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const text = textContent.text.trim();
      // Strip markdown code fences if present
      const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const questions = JSON.parse(jsonText) as Question[];

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format from Claude');
      }

      // Validate structure
      for (const q of questions) {
        if (!q.question || !q.options || !q.correct || !q.fun_fact) {
          throw new Error('Question missing required fields');
        }
        if (!['A', 'B', 'C', 'D'].includes(q.correct)) {
          throw new Error('Invalid correct answer option');
        }
      }

      console.log(`[Claude] Generated ${questions.length} questions for ${topic}/${difficulty}`);
      return questions;
    } catch (err) {
      console.error('[Claude] Question generation failed, using fallback:', err instanceof Error ? err.message : err);
      return this.getFallbackQuestions(topic, difficulty, count);
    }
  }

  private getFallbackQuestions(topic: Topic, difficulty: Difficulty, count: number): Question[] {
    try {
      const fallbackPath = path.join(__dirname, '../../data/fallback_questions.json');
      const raw = fs.readFileSync(fallbackPath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, Record<string, Question[]>>;

      // Try exact topic+difficulty match first
      let pool: Question[] = data[topic]?.[difficulty] || [];

      // If not enough, try any difficulty for this topic
      if (pool.length < count) {
        const topicData = data[topic] || {};
        pool = Object.values(topicData).flat();
      }

      // If still not enough, use all questions
      if (pool.length < count) {
        pool = Object.values(data).flatMap((t) => Object.values(t).flat());
      }

      if (pool.length === 0) {
        throw new Error('No fallback questions available');
      }

      // Shuffle and pick count questions
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);

      // Re-index
      return selected.map((q, i) => ({ ...q, id: i + 1 }));
    } catch (err) {
      console.error('[Fallback] Failed to load fallback questions:', err);
      throw new Error('Failed to generate questions and fallback unavailable');
    }
  }
}

export const claudeService = new ClaudeService();
