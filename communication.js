import { Subject, BehaviorSubject, ReplaySubject } from 'rxjs';

let topics = [];
let subjects = {};

/**
 * @name topic
 * @description A small wrapper over the rxjs to offer the topic method on top of it
 * @param event [String] Event name
 * @param step [String] How many values to be buffed for new subscribers - default 0
 * @returns ReplaySubject
 */

const topic = (event, step = 0) => {
  if (topics.indexOf(event) == -1) {
    let replaySubject = new ReplaySubject(step);

    subjects[event] = replaySubject;
    
    topics.push(event);
  }

  return subjects[event];
}

const usePostMessageForTopics = (events = [], target) => {
  for (let index in events) {
    subjects[events[index]].subscribe((data) => {
      window.postMessage({ type: events[index], data });
    });
  }
}

export { topic }
