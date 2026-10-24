import {proxyActivities} from '@temporalio/workflow';
const {prepareEvening}=proxyActivities({startToCloseTimeout:'5 minutes',retry:{maximumAttempts:3,initialInterval:'3 seconds',maximumInterval:'30 seconds'}});
export async function bedtimePack(preferences){
  const stories=[];
  for(let evening=1;evening<=3;evening++){
    // Completed activities are restored from Temporal history on worker restart.
    stories.push(await prepareEvening({preferences,evening}));
  }
  return stories;
}
