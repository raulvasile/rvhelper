import { Subject, BehaviorSubject, ReplaySubject } from 'rxjs';

let topics = [];
let subjects = {};

/**
 * @name topic
 * @description A small wrapper over the rxjs to offer the topic method on top of it
 * @param event [String] Event name
 * @param type [String] Type of the subject - Possible values: Subject | BehaviorSubject | ReplaySubject
 * @param step [String] How many values to be buffed for new subscribers
 * @returns Subject | BehaviorSubject | ReplaySubject
 */

const topic = (event, type, step) => {
  this.event = event;

  if (topics.indexOf(event) == -1) {
    topics.push(event);

    switch(type) {
      case 'Subject':
        let subject = new Subject();

        subjects[event] = subject;

        break;

      case 'BehaviorSubject':
        let behaviorSubject = new BehaviorSubject(0);

        subjects[event] = behaviorSubject;

        break;

      case 'ReplaySubject':
        let replaySubject = new ReplaySubject(step);

        subjects[event] = replaySubject;

        break;

      default:
        let def = new Subject();

        subjects[event] = def;

        break;
    }
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
