const Instagram = require("instagram-web-api");
const Downloader = require("nodejs-file-downloader");
const FileCookieStore = require('tough-cookie-filestore2');
require('dotenv').config();

async function main() {
  const cookieStore = new FileCookieStore('./cookies.json');
  const instaUser = {
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
  };

  const client = new Instagram({
    ...instaUser,
    cookieStore
  });
  const username = process.env.PHOTO_USER;

  await client.login(instaUser);
  const { user } = await client.getPhotosByUsername({ username});
  let photoObj = user.edge_owner_to_timeline_media;

  let photoUrls = await getPictures(photoObj);

  while (photoObj.page_info.has_next_page) {
    photoObj = (
      await client.getPhotosByUsername({
        username,
        after: photoObj.page_info.end_cursor,
      })
    ).user.edge_owner_to_timeline_media;

    photoUrls = [...photoUrls, ...(await getPictures(photoObj))];
  }

  const pictureAmount = photoUrls.length;
    
  for (let i = 0; i < pictureAmount; i++) {
    try {
      const downloader = new Downloader({
        url: photoUrls[i],
        directory: `./instagram-${username}`
      });
      await downloader.download();
      console.log(`Downloaded media ${i + 1} of a total ${pictureAmount}`);
    } catch (err) {
      console.error(err);
      break;
    }
  }
}

async function getPictures(photoObj) {
  const edges = photoObj.edges;
  const photoUrls = [];
  console.log(`Getting media URLs of ${edges.length} posts`);

  for (const { node } of edges) {
    const children = node.edge_sidecar_to_children;

    if (!children) {
      if (node.is_video) {
        photoUrls.push(node.video_url)
      } else {
        photoUrls.push(node.display_url)
      }
      continue;
    }
    const childEdges = children.edges;

    for (const { node: childNode } of childEdges) {
      if (childNode.is_video) {
        photoUrls.push(childNode.video_url);
      } else {
        photoUrls.push(childNode.display_url);
      }
    }
  }

  return photoUrls;
}

main();
