import { useChat } from '@ai-sdk/react';
useChat({
  onFinish: (...args: any[]) => {
    console.log(args);
  }
});
