1. Using a GLIB file (for glman) or using the GLSL API, be able to vary the following parameters:
    - uAd:	Ellipse diameter in s
    - uBd:	Ellipse diameter in t
    - uTol:	Width of the blend between ellipse and non-ellipse areas
    - uNoiseAmp:	Noise Amplitude
    - uNoiseFreq:	Noise Frequency
    - uUseXYZforNoise:	How to compute the noise

    If you are using glman, the .glib file might look something like this:
    ```
    ##OpenGL GLIB
    LookAt  0 0 3  0 0 0  0 1 0
    Perspective 70
    
    Vertex   ovalnoise.vert
    Fragment ovalnoise.frag
    Program  OvalNoise                                              \
            uAd <.01 .05 .5>  uBd <.01 .05 .5>                      \
            uTol <0. 0. 1.>						\
            uNoiseAmp <0. 0. 1.>  uNoiseFreq <0. 1. 10.>		\
      uUseXYZforNoise	<false>
    
    
    Color 1. .9 0
    Sphere 1.0 50 50
    Sphere 0.5 50 50
    ```
    If you are using the API, use KeyTime animation to show the effects of uNoiseAmp and uNoiseFreq:
    ```C++
    // a defined value:
    const int MSEC = 10000;         // 10000 milliseconds = 10 seconds
    
    // a global:
    Keytimes NoiseAmp;
    
    
    // in InitGraphics( ):
            NoiseAmp.Init( );
            NoiseAmp.AddTimeValue(  0.0,  ????? );
            NoiseAmp.AddTimeValue(  2.0,  ????? );
            NoiseAmp.AddTimeValue(  5.0,  ????? );
            NoiseAmp.AddTimeValue(  8.0,  ????? );
            NoiseAmp.AddTimeValue( 10.0,  ????? );
    
    // in InitLists( ):
            SphereFullList = glGenLists( 1 );
            glNewList( SphereFullList, GL_COMPILE );
              OsuSphere( 1., 50, 50 );
            glEndList( );
          
            SphereHalfList = glGenLists( 1 );
            glNewList( SphereHalfList, GL_COMPILE );
              OsuSphere( .5, 50, 50 );
            glEndList( );
    
    
    // in Animate( ):
            glutSetWindow( MainWindow );
            glutPostRedisplay( );
    
    
    // in Display( ):
            // turn # msec into the cycle ( 0 - MSEC-1 ):
            int msec = glutGet( GLUT_ELAPSED_TIME )  %  MSEC;
    
            // turn that into a time in seconds:
            float nowTime = (float)msec  / 1000.;
    
            Pattern.Use( );
      Pattern.SetUniformVariable( "uNoiseAmp", NoiseAmp.GetValue( nowTime ) );
            . . .
      glCallList( SphereFullList );
      glCallList( SphereHalfList );
            Pattern.UnUse( );
    ```
    Use an entry in the Keyboard( ) function to to toggle between true and false for uUseXYZforNoise.
    ```C++
    bool UseXYZ;		// declared in the globals
    . . .
    UseXYZ = false;		// set in Reset( )
    . . .
    // In Keyboard( ):
    case 'n':
    case 'N':
      UseXYZ = ! UseXYZ;
      break;
    . . .
    
    // In Display:
    if( UseXYZ )
      Pattern.SetUniformVariable( "uUseXYZforNoise", 1 );
    else
      Pattern.SetUniformVariable( "uUseXYZforNoise", 0 );
    ```
2. Remember that the border of an ellipse, defined in s and t coordinates, is:
    d = (s-sc)2 / Ar2 + (t-tc)2 / Br2 = 1
3. The **uNoiseFreq** parameter is the frequency of the noise function, i.e., it multiplies what goes into the noise function.
4. The **uNoiseAmp** parameter is the amplitude of the noise function, i.e., it multiplies the noise value.
5. The effects of the **uNoiseAmp** and **uNoiseFreq** parameters should look something like this:
   
   ![](https://web.engr.oregonstate.edu/~mjb/cs557/Projects/ovalnoise1.jpg "uNoiseAmp")
   ![](https://web.engr.oregonstate.edu/~mjb/cs557/Projects/ovalnoise2.jpg "uNoiseFreq")

6. The **uTol** parameter is the width of a **smoothstep( )** blend between the ellipse and non-ellipse areas, thus smoothing the abrupt color transition.

    float t = smoothstep( 1. - uTol, 1. + uTol, d );

    Then use **t** in the **mix** function.

    ![](https://web.engr.oregonstate.edu/~mjb/cs557/Projects/ovalnoise4.jpg "uTol")

7. The **uUseXYZforNoise** uniform bool parameter tells the fragment shader whether to get the noise value by:
    1. Using (s,t,0.) to index into a 3D noise texture
    2. Using (x,y,z) to index into a 3D noise texture 
    You must have 2 copies of the same object visible in your scene to show that the XYZ-for-Noise works. A small sphere inside a large sphere works very well.
8. You can have as many other uniform variables as you wish.
9. Do per-fragment lighting just as you did in Project #1.
10. As we discussed in class, get a noise value by indexing into a noise texture. Use all 4 octaves available. Then use that value to alter the ds and dt values. Then use those new ds and dt values to determine the correct color to use.
    ```C++
    // get the noise from the glman 3D noise texture
    // look it up using (s,t,0.) if using 2D texture coords:
    // look it up using (x,y,z)  if using 3D model   coords:
    
    uniform sampler3D Noise3;
    
    . . .
    
    vec4 nv;
    if( ??? )
            nv  = texture( Noise3, uNoiseFreq*vMCposition );
    else
            nv  = texture( Noise3, uNoiseFreq*vec3(vST,0.) );
    
    // give the noise a range of [-1.,+1.]:
    
    float n = nv.r + nv.g + nv.b + nv.a;    //  1. -> 3.
    n = n - 2.;                             // -1. -> 1.
    n *= uNoiseAmp;				// -uNoiseAmp -> uNoiseAmp
    
    << determine sc and tc >>
    
    << determine ds and dt >>
    
    float oldDist = sqrt( ds*ds + dt*dt );
    float newDist = oldDist + n;
    float scale = newDist / oldDist;        // this could be < 1., = 1., or > 1.
    
    << scale ds and dt >>
    
    << divide the modified ds and dt by Ar and Br, respectively >>
    
    << compute d by squaring the modified quantities and adding them together >>
    
    << use d in the smoothstep( ) function  >>
    
    << use what you get back from smoothstep( ) to mix( ) the 2 colors >>
    << this gives you the noise-modified pattern >>
    ```
11. The choice of geometry is up to you. You are allowed to contrive the size to make it work. 

# Using Objects Other Than A Sphere
You can try this with any solid objects you want. However, be aware that not all solid objects have built-in (s,t) texture coordinates. In glman, the sphere, cone, torus, and teapot have them. The others don't. (Blame this on GLUT.) Many of the hundreds (thousands) of free .obj files available on the net have them. (You can check this by editing the .obj file and ensuring that there are lines beginning with "vt".) Also, be aware that not all .obj objects have built-in surface normals (nx,ny,nz). (You can check this by editing the .obj file and ensuring that there are lines beginning with "vn".)

If you want to use an OBJ object in glman, download it and include it in your GLIB file like this:
`Obj spaceship.obj`

Or use an OBJ file in your C/C++ file by placing the .obj object into a display list:
```C++
// a global variable:
GLuint DL;

. . .

// do this in InitLists( ):
DL = glGenLists( 1 );
glNewList( DL, GL_COMPILE );
LoadObjFile( "spaceship.obj" );
glEndList( );

. . .

// and do this in Display( ):
Pattern.Use( );
. . .
glCallList( DL );
. . .
Pattern.UnUse( );
```
# Hints

Use the philosophy that you get the (s,t) or (x,y,z) coordinates of the current fragment, perturb them according to the noise parameters, then use the perturbed coordinates in the equation. 
