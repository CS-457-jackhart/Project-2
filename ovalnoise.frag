#version 330 compatibility

// lighting uniform variables -- these can be set once and left alone:
float   uKa = 0.1f;
float   uKd = 0.5f;
float   uKs = 0.4f;			// coefficients of each type of lighting -- make sum to 1.0
float   uShininess = 12.f;	// specular exponent

// square-equation uniform variables -- these should be set every time Display( ) is called:

uniform float	 uAd;			// Ellipse diameter for s
uniform float	 uBd;			// Ellipse diameter for t
uniform float	 uTol;			// Width of the blend between ellipse and non-ellipse areas
uniform float	 uNoiseAmp;		// Noise Amplitude
uniform float	 uNoiseFreq;		// Noise frequency
uniform bool	 uUseXYZforNoise;	// How to compute the noise
uniform sampler3D Noise3;

// in variables from the vertex shader and interpolated in the rasterizer:

in  vec3  vN;		   // normal vector
in  vec3  vL;		   // vector from point to light
in  vec3  vE;		   // vector from point to eye
in  vec2  vST;		   // (s,t) texture coordinates
in  vec3	vMCposition;


void
main()
{
	vec3 Normal = normalize(vN);
	vec3 Light = normalize(vL);
	vec3 Eye = normalize(vE);
	vec3 myColor = vec3(0.95, 0.95, 0.95);		// whatever default color you'd like
	vec3 mySpecularColor = vec3(1., 1., 1.);	// whatever default color you'd like

	vec4 nv = texture(Noise3, uNoiseFreq * vMCposition);
	float n = nv.r + nv.g + nv.b + nv.a;		// Range is [1, 3]
	n -= 2;								// Range is now [-1, 1]
	n *= uNoiseAmp;						// Range is now [0, uNoiseAmp]

	float s = vST.s;
	float t = vST.t;

	// determine the color using the ellipse-boundary equations:

	float rad_a = uAd / 2.;
	float rad_b = uBd / 2.;
	int numins = int(s / uAd);
	int numint = int(t / uBd);
	float s_c = numins * uAd + rad_a;
	float t_c = numint * uBd + rad_b;

	float ds = s - s_c; // Distance from center
	float dt = t - t_c; // Distance from center

	// Calculate scale of noise
	float dist = sqrt(ds * ds + dt * dt);
	float scale = (dist + n) / dist;

	// Calculate elipse equation
	float s_pow = pow((ds * scale) / rad_a, 2);
	float t_pow = pow((dt * scale) / rad_b, 2);

	float ttime = smoothstep(1. - uTol, 1. + uTol, s_pow + t_pow);
	vec3 newCol = mix(vec3(1., 0.5, 0.4), myColor, ttime);
	myColor = newCol;

	// apply the per-fragment lighting to myColor:

	vec3 ambient = uKa * myColor;
	float d = 0.;
	float spec = 0.;
	if (dot(Normal, Light) > 0.) // only do specular if the light can see the point
	{
		d = dot(Normal, Light);
		vec3 ref = normalize(reflect(-Light, Normal)); // reflection vector
		spec = pow(max(dot(Eye, ref), 0.), uShininess);
	}
	vec3 diffuse = uKd * d * myColor;
	vec3 specular = uKs * spec * mySpecularColor;
	gl_FragColor = vec4(ambient + diffuse + specular, 1.);
}

