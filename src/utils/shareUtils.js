import api from "../api";

export const sendWhatsAppInvite = async (groupId, groupName) => {
  try {
    const { data } = await api.post(`/groups/${groupId}/invite`);
    const { inviteUrl } = data;

    const message = `Hey! Join our Dinner group "${groupName}" \n${inviteUrl}`;
    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMsg}`;

    // if mobile web share API
    if (navigator.share) {
      await navigator.share({
        title: "Diner FF Invite",
        text: message,
        url: inviteUrl,
      });
    } else {
      // fallback for desktop / whatsapp
      window.open(whatsappUrl, "_blank");
    }
  } catch (err) {
    console.error("Error sending invite:", err);
  }
};
