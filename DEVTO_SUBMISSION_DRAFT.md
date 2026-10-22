---
title: "VivaSloth AI: Less Practical Prep Busywork, No Giant Model Download 🦥"
published: false
tags: devchallenge, hf26challenge, python, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).* 

## What I Built

VivaSloth AI is a study workspace for GTU and other engineering students. It turns a syllabus, lab manual, code file or a readable screenshot into a practical prep pack, syllabus map, GTU marks-wise answer or structured notes. Students can also run a one-question-at-a-time mock viva and receive feedback with a score and suggested improved answer.

I built it around a problem I understand as a computer engineering student: before a practical or exam, organizing the material can take almost as much effort as revising it.

## Demo

[Add an actual screen-recording video after testing every feature with OpenRouter.]

Suggested demo: dashboard → load sample practical → generate prep pack → select a 5-mark GTU answer → upload a readable screenshot → run one mock-viva question. Do not show your API key.

## Code

[Add the public GitHub repository link after pushing this project.]

## How I Built It

The interface uses HTML, CSS and JavaScript, with a small Flask backend. It extracts text from PDF and code files in memory and sends prompts to the OpenRouter API. For screenshots, it sends an image input to a compatible vision-capable model. The default model is `qwen/qwen3.8-27b:free`, listed by OpenRouter as a free open-weight multimodal Qwen model. The model ID can be changed in `.env` without changing the app code.

The new dashboard includes six practical study shortcuts, a syllabus-to-7-day study map, GTU marks-wise answers (2, 3, 4, 5 or 7 marks), screenshot-to-notes, code explanation, question sets, interactive mock viva and browser-local history.

## Why Does Open Innovation Matter?

I wanted to build around an open-weight model without forcing students to download hundreds of megabytes of model weights or a separate inference runtime. This makes setup easier on laptops with limited storage, while keeping the model choice configurable.

This approach has a trade-off. Inference is hosted by OpenRouter and the provider serving the model, so pasted text, extracted file text, screenshots and mock-viva answers are sent to those services. The app needs internet, and free endpoints may be rate-limited or temporarily unavailable. Users should not submit private or sensitive material. This is not an offline or local-private inference setup.

Using an open-weight model through a standard API keeps the model choice visible and replaceable rather than tying the app to one closed model. The app automates the repetitive first draft of study prep, then lets students verify the material and focus on understanding it.

## The Lazy Payoff

[After testing, add an honest before/after example. Count the steps or minutes needed to prepare the same notes manually and with VivaSloth. Do not claim a time saving until you have measured it.]

## Prize Categories

No partner prize category is claimed in this draft. Add one only if the final project meaningfully uses that partner's technology and meets that category's current requirements.
