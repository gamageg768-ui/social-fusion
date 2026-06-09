import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600000);
}

function minsAgo(mins: number): Date {
  return new Date(Date.now() - mins * 60000);
}

export async function seedDatabase() {
  const count = await prisma.user.count();
  if (count > 0) return;

  console.log('🌱 Seeding database...');

  const usersData = [
    { username: 'alex_chen', name: 'Alex Chen', bio: '📸 Photographer | 🌏 Explorer | Capturing life one frame at a time', location: 'San Francisco, CA', website: 'alexchen.io', followers_count: 24300, following_count: 891, posts_count: 312, is_verified: true },
    { username: 'maya_patel', name: 'Maya Patel', bio: '🎨 Digital artist & UI designer. Creating beauty in pixels ✨', location: 'New York, NY', website: 'mayaarts.co', followers_count: 58900, following_count: 1203, posts_count: 487, is_verified: true },
    { username: 'jordan_river', name: 'Jordan Rivera', bio: '🏋️ Fitness coach | Nutritionist | Living my best life 💪', location: 'Miami, FL', website: '', followers_count: 12400, following_count: 560, posts_count: 198, is_verified: false },
    { username: 'sophia_kim', name: 'Sophia Kim', bio: '☕ Coffee addict | 📚 Bookworm | Tech enthusiast | Seoul → LA', location: 'Los Angeles, CA', website: 'sophiakim.dev', followers_count: 8900, following_count: 432, posts_count: 156, is_verified: false },
    { username: 'liam_foster', name: 'Liam Foster', bio: '🎵 Music producer | Making waves in the industry 🎧', location: 'Nashville, TN', website: 'liambeats.com', followers_count: 34500, following_count: 789, posts_count: 267, is_verified: true },
    { username: 'zoe_williams', name: 'Zoe Williams', bio: '🌱 Plant mom | Sustainability advocate | Zero waste living 🌍', location: 'Portland, OR', website: '', followers_count: 15600, following_count: 923, posts_count: 234, is_verified: false },
    { username: 'noah_santos', name: 'Noah Santos', bio: '🚀 Startup founder | Building the future | Dreaming big 💡', location: 'Austin, TX', website: 'noahsantos.co', followers_count: 29800, following_count: 1100, posts_count: 345, is_verified: true },
    { username: 'emma_laurent', name: 'Emma Laurent', bio: '🍕 Food blogger | Culinary adventures around the world 🌮', location: 'Chicago, IL', website: 'emmataste.com', followers_count: 41200, following_count: 678, posts_count: 521, is_verified: true },
    { username: 'kai_nakamura', name: 'Kai Nakamura', bio: '🎮 Streamer | Pro gamer | Esports enthusiast ⚡', location: 'Tokyo, Japan', website: 'twitch.tv/kai_naka', followers_count: 87300, following_count: 2100, posts_count: 890, is_verified: true },
    { username: 'priya_sharma', name: 'Priya Sharma', bio: '💻 Full-stack dev | Open source contributor | Code is poetry 🐍', location: 'Bangalore, India', website: 'priyacodes.dev', followers_count: 19700, following_count: 876, posts_count: 289, is_verified: false },
    { username: 'carlos_mendez', name: 'Carlos Mendez', bio: '📽️ Filmmaker | Visual storyteller | Award-winning director', location: 'Los Angeles, CA', website: 'carlosmendez.film', followers_count: 52100, following_count: 445, posts_count: 178, is_verified: true },
    { username: 'aisha_johnson', name: 'Aisha Johnson', bio: '✊ Activist | Lawyer | Fighting for justice every day 🗽', location: 'Washington, DC', website: '', followers_count: 67800, following_count: 1890, posts_count: 632, is_verified: true },
    { username: 'ryan_oc', name: "Ryan O'Connor", bio: '🏄 Surfer | Travel addict | Sun, sea & good vibes 🌊', location: 'Sydney, Australia', website: '', followers_count: 9800, following_count: 340, posts_count: 145, is_verified: false },
    { username: 'isabela_costa', name: 'Isabela Costa', bio: '💃 Dancer | Choreographer | Living life to the rhythm 🎶', location: 'São Paulo, Brazil', website: 'isabeladance.com', followers_count: 44500, following_count: 1340, posts_count: 398, is_verified: true },
    { username: 'you', name: 'You (Demo)', bio: '👋 Welcome to SocialFusion! Explore all features here.', location: 'Everywhere', website: 'socialfusion.app', followers_count: 1024, following_count: 512, posts_count: 42, is_verified: false },
  ];

  const users = await Promise.all(
    usersData.map((ud, i) =>
      prisma.user.create({
        data: {
          ...ud,
          email: `${ud.username}@fusion.app`,
          avatar: `https://picsum.photos/seed/${i + 100}/200/200`,
          cover: `https://picsum.photos/seed/${i + 200}/800/300`,
          created_at: daysAgo(randomInt(100, 1000)),
        },
      })
    )
  );

  const postContents: [string, boolean][] = [
    ['Just shipped a major update to my portfolio! Check out the new animations 🚀 #design #webdev', true],
    ['Golden hour hits different when you\'re in the right mindset ✨🌅', true],
    ['This week\'s workout was INSANE. Hit a new PR on bench press! 225lbs 💪 #fitness #gym', true],
    ['Reading \'Atomic Habits\' for the third time. Every read reveals something new 📚', false],
    ['New track dropping this Friday! Been working on this for months 🎵🔥 #music #producer', true],
    ['Just composted my first batch of kitchen scraps! Small steps = big impact 🌱', false],
    ['Pitch day was a success! We\'re officially funded 🎉 Huge thanks to our investors!', true],
    ['Made homemade ramen from scratch. 14 hours of work. Absolutely worth it 🍜', true],
    ['Live on Twitch in 30 mins! Playing the new update — come join ⚡ #gaming #live', true],
    ['Deployed my first production Kubernetes cluster today. Nervous but excited! 💻', false],
    ['Wrapped filming on the new short film. Can\'t wait to share this story with the world 🎬', true],
    ['Peaceful Sunday morning. Coffee, journaling, and gratitude ☀️', false],
    ['6AM surf session. The ocean is always the answer 🌊🏄', true],
    ['Tonight\'s performance was electric! The crowd was AMAZING 💃🎶 #dance #live', true],
    ['Nothing beats a good sunset on the Pacific. Today was a good day 🌅', true],
    ['Hot take: React Server Components will change everything. Here\'s why 🧵👇', false],
    ['New photography series: Urban Solitude. Lonely moments in busy cities 📸', true],
    ['3 months of consistent training and the results speak for themselves 💪 #transformation', true],
    ['Launching a new open-source project this weekend! Stay tuned 🚀 #coding', false],
    ['Farmers market haul 🥦🍅🥕 Supporting local always feels right #sustainable', true],
    ['The startup grind is real. But the mission keeps me going every single day 🔥', false],
    ['Tried 5 different ramen shops in Tokyo. Here\'s my honest ranking 🍜 #foodie', true],
    ['Epic gaming session. 15 kills, MVP of the match. Let\'s go! 🎮⚡', true],
    ['Just open-sourced my CLI tool for automating deployments. Link in bio! 💻', false],
    ['Documentary screening was sold out! Thank you all for the love ❤️ #film', true],
    ['Thread: Why mental health days should be normalized in workplaces 🧵', false],
    ['Morning meditation by the beach. Life is good 🙏🌊', false],
    ['Choreographed a piece to this year\'s theme. Rehearsal vibes! 💃', true],
    ['Exploring Kyoto this weekend — every corner is a postcard 🇯🇵🌸', true],
    ['Coffee chat turned into a 4-hour strategy session. Love my team! ☕', false],
  ];

  const imageSeeds = Array.from({ length: 99 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  const postTypes = ['post', 'post', 'post', 'tweet'];

  const posts = await Promise.all(
    postContents.map(([content, hasImage], i) => {
      const user = users[i % (users.length - 1)];
      return prisma.post.create({
        data: {
          user_id: user.id,
          content,
          image_url: hasImage ? `https://picsum.photos/seed/${imageSeeds[i]}/600/400` : '',
          likes_count: randomInt(50, 12000),
          comments_count: randomInt(5, 500),
          shares_count: randomInt(2, 300),
          post_type: randomChoice(postTypes),
          created_at: hoursAgo(randomInt(1, 72)),
        },
      });
    })
  );

  // Stories
  for (let i = 0; i < users.length - 1; i++) {
    const count = randomInt(1, 3);
    for (let j = 0; j < count; j++) {
      await prisma.story.create({
        data: {
          user_id: users[i].id,
          image_url: `https://picsum.photos/seed/${300 + i * 3 + j}/400/700`,
          viewed: Math.random() > 0.5,
          created_at: hoursAgo(randomInt(1, 20)),
        },
      });
    }
  }

  // Comments
  const commentTexts = [
    'This is absolutely amazing! 🔥', 'Love this so much! ❤️', 'You\'re an inspiration!',
    'Goals! 💪', 'Incredible work as always', 'Can\'t wait to see more!',
    'This made my day 😊', 'Wow, just wow 🤩', 'Following for more content!',
    'Drop the tutorial please!', 'Been waiting for this!', 'You never disappoint!',
    'This is elite content 👏', 'Tag me next time!', 'Saved this! 💾',
    'Just discovered your page — staying forever!', 'The quality of your work is unmatched',
    'Send me the recipe!', 'Which camera/gear are you using?', 'Bro, I needed this today 🙌',
  ];

  for (const post of posts) {
    const numComments = Math.min(post.comments_count, randomInt(2, 6));
    for (let k = 0; k < numComments; k++) {
      const commentUser = randomChoice(users);
      await prisma.comment.create({
        data: {
          post_id: post.id,
          user_id: commentUser.id,
          content: randomChoice(commentTexts),
          likes_count: randomInt(0, 200),
          created_at: new Date(post.created_at.getTime() + randomInt(5, 300) * 60000),
        },
      });
    }
  }

  // Messages
  const msgPairs: [number, number][] = [
    [0,1],[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,10],[9,11],[10,12],[11,13],[12,13],[13,14]
  ];
  const convoMessages = [
    ['Hey! Love your latest post!', 'Thank you so much! 😊', 'How did you do that effect?', "It's all in the editing app, I'll DM you the tutorial!", "You're the best! 🙌"],
    ['Are you coming to the event this weekend?', "Yes! Can't wait!", "It's going to be epic 🔥", "Let's meet up before!", "Sounds great! Text me when you're there"],
    ['Just saw your update — amazing!', 'Thanks! Was working on it for weeks', 'It totally shows, the quality is insane', "You're too kind 🙏", 'Seriously, keep it up!'],
    ['Quick question about your setup?', 'Of course! What do you need?', 'What mic are you using for recordings?', "It's the Blue Yeti Pro — highly recommend!", 'Ordering one now lol'],
    ['Collaboration?? 👀', "YES. I've been thinking the same thing!", "Let's hop on a call this week", "How's Thursday 3pm?", 'Perfect, sending the invite now!'],
  ];

  for (let idx = 0; idx < msgPairs.length; idx++) {
    const [i1, i2] = msgPairs[idx];
    if (i1 < users.length && i2 < users.length) {
      const u1 = users[i1], u2 = users[i2];
      const msgs = convoMessages[idx % convoMessages.length];
      const baseTime = new Date(Date.now() - randomInt(1, 48) * 3600000);
      for (let k = 0; k < msgs.length; k++) {
        const sender = k % 2 === 0 ? u1 : u2;
        const receiver = k % 2 === 0 ? u2 : u1;
        await prisma.message.create({
          data: {
            sender_id: sender.id,
            receiver_id: receiver.id,
            content: msgs[k],
            is_read: k < msgs.length - 1,
            created_at: new Date(baseTime.getTime() + k * 300000),
          },
        });
      }
    }
  }

  // Reels
  const reelData: [string, string][] = [
    ['POV: you found the perfect editing preset 🎬✨', 'Aesthetic Vibes'],
    ['Morning routine that changed my life 💪', 'Motivational Mix'],
    ['Day in my life as a music producer 🎵', 'Lo-fi Beats'],
    ['Cooking the world\'s best ramen from scratch 🍜', 'Chill Cooking'],
    ['Epic gaming montage — season highlights ⚡', 'Gaming Anthem'],
    ['My zero-waste morning routine 🌱', 'Nature Sounds'],
    ['Building my first app in 24 hours 💻🚀', 'Code & Coffee'],
    ['Salsa lesson in 60 seconds! 💃', 'Salsa Rhythm'],
    ['Drone shots of hidden beaches 🌊🏄', 'Ocean Waves'],
    ['Startup journey: from idea to launch 🚀', 'Entrepreneur Beat'],
    ['Tokyo street food tour part 3 🇯🇵🍱', 'J-Pop Remix'],
    ['Dance challenge gone viral 🔥💃', 'Viral Dance Hit'],
    ['Filming golden hour with iPhone vs DSLR 📸', 'Golden Hour'],
    ['5 life-changing apps you\'re not using yet 📱', 'Tech Talk'],
    ['Behind the scenes: short film production 🎥', 'Cinematic Score'],
  ];

  for (let i = 0; i < reelData.length; i++) {
    const [title, audio] = reelData[i];
    const user = users[i % (users.length - 1)];
    await prisma.reel.create({
      data: {
        user_id: user.id,
        title,
        audio,
        thumbnail_url: `https://picsum.photos/seed/${400 + i}/400/700`,
        likes_count: randomInt(500, 95000),
        comments_count: randomInt(50, 3000),
        views_count: randomInt(5000, 500000),
        created_at: hoursAgo(randomInt(1, 96)),
      },
    });
  }

  // Notifications for demo user (last user)
  const me = users[users.length - 1];
  const notifTypes: [string, string][] = [
    ['like', '{} liked your post'],
    ['comment', '{} commented: "This is amazing! 🔥"'],
    ['follow', '{} started following you'],
    ['mention', '{} mentioned you in a post'],
    ['reel', '{} liked your reel'],
  ];

  for (let i = 0; i < 20; i++) {
    const actor = randomChoice(users.slice(0, -1));
    const [notifType, template] = randomChoice(notifTypes);
    await prisma.notification.create({
      data: {
        user_id: me.id,
        actor_id: actor.id,
        notif_type: notifType,
        content: template.replace('{}', actor.name),
        is_read: i > 5,
        created_at: minsAgo(randomInt(5, 2880)),
      },
    });
  }

  console.log('✅ Seed data created successfully!');
}

// Run if called directly
seedDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
