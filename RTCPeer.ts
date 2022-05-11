export class RTCPeer {
	private _RTCIceServers: RTCIceServer[] = [];
	private _RTCPeerConnection: RTCPeerConnection;
	private _remoteMediaStreams: MediaStream[] = [];

	/**
	 * It returns the localMediaStream.
	 * @returns The localMediaStream property is being returned.
	 */
	get localMediaStream() {
		return this._localMediaStream;
	}

	/**
	 * It returns the remoteMediaStreams.
	 * @returns An array of MediaStream objects.
	 */
	get remoteMediaStreams() {
		return this._remoteMediaStreams;
	}

	constructor(
		stunUrls: string[],
		private _localMediaStream: MediaStream | null = null
	) {
		this._RTCIceServers.push({
			urls: stunUrls,
		}); // Configure ICE (STUN or TURN) servers

		this._RTCPeerConnection = new RTCPeerConnection({
			iceServers: this._RTCIceServers,
		}); // Create a new RTCPeerConnection

		this._addLocalMediaStream(); // Add local media stream to the RTCPeerConnection

		this._RTCPeerConnection.addEventListener(
			"icecandidate",
			this._onIceCandidate
		); // Listen for ICE candidates

		this._RTCPeerConnection.addEventListener("track", this._onTrack); // Listen for incoming media streams
	}

	/* Adding the local media stream to the RTCPeerConnection. */
	private _addLocalMediaStream = () => {
		const localMediaStream = this._localMediaStream;

		if (localMediaStream)
			localMediaStream
				.getTracks()
				.forEach((track) =>
					this._RTCPeerConnection.addTrack(track, localMediaStream)
				);
	};

	/* This is a callback function that is called when the RTCPeerConnection receives an ICE candidate. */
	private _onIceCandidate = (event: RTCPeerConnectionIceEvent) => {
		const { candidate: iceCandidate } = event;

		if (!iceCandidate)
			return JSON.stringify(this._RTCPeerConnection.localDescription);
		else {
			const { candidate: candidateString } = iceCandidate;
			return candidateString;
		}
	};

	/* Adding the remote media stream to the RTCPeerConnection. */
	private _onTrack = (event: RTCTrackEvent) => {
		const { streams } = event;

		streams.forEach((stream) => this._remoteMediaStreams.push(stream));
	};

	/* A function that waits for the ICE gathering to complete. */
	private _waitIcegathering = (ms: number) =>
		new Promise((resolve) => setTimeout(resolve, ms));

	/* Creating an offer */
	public createOffer = async () => {
		try {
			const localDescription = await this._RTCPeerConnection.createOffer();
			await this._RTCPeerConnection.setLocalDescription(localDescription);

			await this._waitIcegathering(2000);

			if (this._RTCPeerConnection.iceGatheringState !== "complete") return;
			else return JSON.stringify(this._RTCPeerConnection.localDescription);
		} catch (e) {
			console.log(e);
			return;
		}
	};

	/* Creating an answer to the offer */
	public createAnswer = async (remoteOfferString: string) => {
		try {
			const remoteDescription = new RTCSessionDescription(
				JSON.parse(remoteOfferString)
			);

			await this._RTCPeerConnection.setRemoteDescription(remoteDescription);

			if (remoteDescription.type !== "offer") return;

			const localDescription = await this._RTCPeerConnection.createAnswer();
			await this._RTCPeerConnection.setLocalDescription(localDescription);

			return {
				localDescription,
				remoteDescription,
			};
		} catch (e) {
			console.log(e);
			return;
		}
	};
}
