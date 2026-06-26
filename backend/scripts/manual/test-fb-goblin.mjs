import postToFacebook from "../platforms/social/post-to-facebook.js";
import { getAccount } from "../../utils/accountStore.mjs";

const account = await getAccount("facebook", "fb-color-with-ash");
if (!account) {
	throw new Error("Facebook account fb-color-with-ash not found");
}

const post = {
	title: "my inner light has been outsourced to raccoons",
	body: `Current status:
- surviving
- sarcasm
- snacks
- mayhem

Inner peace?
Outsourced to raccoons.

The trash wizard union is handling operations now.

Available on Gumroad for all overthinkers and chaos professionals:
https://fleurdevie.gumroad.com/l/goblin-ritual-coloring-kit?utm_source=pinterest&utm_medium=social&utm_campaign=goblin-work-evergreen

#GoblinCore #RaccoonEnergy #ChaosGremlin #FunnyArt #GoblinMood`,
	mediaPath: "frontend/assets/goblinaffs/DeserveTreats.png",
	mediaType: "image",
};

const result = await postToFacebook(post, {
	account,
	target: { platform: "facebook", accountId: "fb-color-with-ash" },
});

console.log(JSON.stringify(result, null, 2));
